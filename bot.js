// bot.js - بوت تلغرام متطور كامل مع كل الميزات
// =====================================================

const fs = require("fs");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

// ===================== CONFIG =====================

// توكن البوت
const TOKEN = "7660967028:AAHMkh-xHOC81n7pjhp_IuONwxE1G_72Oqo";
// رقم الأدمن (غيّره لرقمك)
const ADMIN_ID = 8457242337;

// ملفات التخزين
const BUTTONS_FILE = "./buttons.json";
const USERS_FILE = "./users.json";
const LOGS_FILE = "./logs.txt";

// ==================== INIT ========================

// بوت تيليجرام
const bot = new TelegramBot(TOKEN, { polling: true });

// سيرفر Render
const app = express();
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => res.send("✅ البوت يعمل الآن!"));
app.listen(PORT, () => console.log(`🌍 السيرفر يعمل على المنفذ ${PORT}`));

// ==================== DATA ========================

let buttons = fs.existsSync(BUTTONS_FILE)
  ? JSON.parse(fs.readFileSync(BUTTONS_FILE, "utf8"))
  : [];

let users = fs.existsSync(USERS_FILE)
  ? JSON.parse(fs.readFileSync(USERS_FILE, "utf8"))
  : [];

// حفظ الأزرار
function saveButtons() {
  fs.writeFileSync(BUTTONS_FILE, JSON.stringify(buttons, null, 2));
}

// حفظ المستخدمين
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// إضافة سجل حدث
function logEvent(event) {
  const line = `[${new Date().toISOString()}] ${event}\n`;
  fs.appendFileSync(LOGS_FILE, line);
}

// تسجيل المستخدم
function addUser(msg) {
  const exists = users.find(u => u.id === msg.from.id);
  if (!exists) {
    users.push({ id: msg.from.id, first_name: msg.from.first_name, username: msg.from.username || "", clicks: 0 });
    saveUsers();
    logEvent(`مستخدم جديد: ${msg.from.first_name} (${msg.from.id})`);
  }
}

// ================== HELPER ========================

// لوحة البداية حسب صلاحية الأدمن
function startMenu(isAdmin) {
  const menu = [
    [{ text: "📋 عرض الأزرار", callback_data: "show_buttons" }],
    [{ text: "ℹ️ حول البوت", callback_data: "about" }]
  ];
  if (isAdmin) {
    menu.splice(1, 0, [
      { text: "➕ إضافة زر", callback_data: "add_button" },
      { text: "✏️ تعديل زر", callback_data: "edit_button" },
      { text: "🗑️ حذف زر", callback_data: "delete_button" },
      { text: "📣 إرسال جماعي", callback_data: "broadcast" }
    ]);
  }
  return { inline_keyboard: menu };
}

// عرض الأزرار للمستخدمين
function showButtons(chatId) {
  if (!buttons || buttons.length === 0)
    return bot.sendMessage(chatId, "⚠️ لا توجد أزرار حالياً.");

  const keyboard = buttons.map(b => [{ text: b.name, callback_data: "btn_" + b.name }]);
  bot.sendMessage(chatId, "📋 الأزرار المتاحة:", { reply_markup: { inline_keyboard: keyboard } });
}

// =================== BOT EVENTS ==================

// /start
bot.onText(/\/start/, (msg) => {
  addUser(msg);
  const chatId = msg.chat.id;
  const isAdmin = msg.from.id === ADMIN_ID;
  bot.sendMessage(
    chatId,
    isAdmin ? "👋 مرحباً أيها المدير!" : "👋 أهلاً بك!",
    { reply_markup: startMenu(isAdmin) }
  );
});

// التعامل مع الضغط على الأزرار
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const fromId = query.from.id;
  const data = query.data;
  const isAdmin = fromId === ADMIN_ID;

  addUser(query.message);
  try { await bot.answerCallbackQuery(query.id); } catch {}

  // معلومات البوت
  if (data === "about") {
    return bot.sendMessage(chatId, "🤖 بوت متطور بإدارة أزرار، إرسال جماعي، سجل أحداث، إشعارات، وحفظ المستخدمين.", { parse_mode: "Markdown" });
  }

  // عرض الأزرار
  if (data === "show_buttons") return showButtons(chatId);

  // ========== وظائف الأدمن ==========
  if (!isAdmin) {
    if (["add_button","edit_button","delete_button","broadcast"].includes(data)) {
      return bot.sendMessage(chatId,"⛔ هذا الخيار للأدمن فقط.");
    }
  }

  // إضافة زر
  if (data === "add_button") {
    await bot.sendMessage(chatId,"📝 أرسل الصيغة لإضافة زر:\n`اسم الزر | نوع:نص|رابط|صورة|ملف | محتوى الزر`",{parse_mode:"Markdown"});
    bot.once("message", msg => {
      if (msg.from.id !== ADMIN_ID) return;
      const text = msg.text.split("|").map(t => t.trim());
      if(text.length < 3) return bot.sendMessage(chatId,"❌ الصيغة غير صحيحة.");
      const [name,type,content] = text;
      if(buttons.find(b => b.name===name)) return bot.sendMessage(chatId,"⚠️ هذا الزر موجود مسبقاً.");
      buttons.push({name,type,content});
      saveButtons();
      logEvent(`تم إضافة زر: ${name} (نوع: ${type})`);
      bot.sendMessage(chatId,`✅ تمت إضافة الزر *${name}*`,{parse_mode:"Markdown"});
    });
  }

  // تعديل زر
  if (data === "edit_button") {
    if(buttons.length===0) return bot.sendMessage(chatId,"⚠️ لا توجد أزرار لتعديلها.");
    const keyboard = buttons.map(b=>[{text:b.name,callback_data:"edit_"+b.name}]);
    return bot.sendMessage(chatId,"✏️ اختر الزر لتعديله:",{reply_markup:{inline_keyboard:keyboard}});
  }

  if(data.startsWith("edit_")) {
    const name = data.split("_")[1];
    const btn = buttons.find(b=>b.name===name);
    if(!btn) return bot.sendMessage(chatId,"❌ الزر غير موجود.");
    bot.sendMessage(chatId,"🔁 أرسل المحتوى الجديد للزر (نوع|المحتوى):",{parse_mode:"Markdown"});
    bot.once("message",msg=>{
      if(msg.from.id!==ADMIN_ID) return;
      const arr = msg.text.split("|").map(t=>t.trim());
      if(arr.length<2) return bot.sendMessage(chatId,"❌ الصيغة غير صحيحة.");
      btn.type=arr[0]; btn.content=arr[1];
      saveButtons();
      logEvent(`تم تعديل زر: ${name}`);
      bot.sendMessage(chatId,`✅ تم تعديل الزر *${name}*`,{parse_mode:"Markdown"});
    });
  }

  // حذف زر
  if(data==="delete_button") {
    if(buttons.length===0) return bot.sendMessage(chatId,"⚠️ لا توجد أزرار للحذف.");
    const keyboard = buttons.map(b=>[{text:"❌ "+b.name,callback_data:"del_"+b.name}]);
    return bot.sendMessage(chatId,"🗑️ اختر الزر لحذفه:",{reply_markup:{inline_keyboard:keyboard}});
  }

  if(data.startsWith("del_")) {
    const name=data.split("_")[1];
    const index=buttons.findIndex(b=>b.name===name);
    if(index===-1) return bot.sendMessage(chatId,"⚠️ الزر غير موجود.");
    buttons.splice(index,1);
    saveButtons();
    logEvent(`تم حذف زر: ${name}`);
    bot.sendMessage(chatId,`🗑️ تم حذف الزر *${name}*`,{parse_mode:"Markdown"});
  }

  // الإرسال الجماعي
  if(data==="broadcast") {
    bot.sendMessage(chatId,"📣 أرسل الرسالة الجماعية للمستخدمين (نص أو رابط أو صورة):");
    bot.once("message",msg=>{
      if(msg.from.id!==ADMIN_ID) return;
      users.forEach(u=>{
        try{bot.sendMessage(u.id,msg.text);}catch{}
      });
      logEvent(`تم إرسال رسالة جماعية: ${msg.text}`);
      bot.sendMessage(chatId,"✅ تم الإرسال لجميع المستخدمين.");
    });
  }

  // ========== ضغط أي زر ==========
  if(data.startsWith("btn_")) {
    const name = data.split("btn_")[1];
    const btn = buttons.find(b=>b.name===name);
    if(!btn) return;
    // إرسال حسب النوع
    if(btn.type==="نص") bot.sendMessage(chatId,btn.content);
    else if(btn.type==="رابط") bot.sendMessage(chatId,`🔗 ${btn.content}`);
    else if(btn.type==="صورة") bot.sendPhoto(chatId,btn.content);
    else if(btn.type==="ملف") bot.sendDocument(chatId,btn.content);
    logEvent(`المستخدم ${fromId} ضغط على الزر: ${name}`);
  }

});
console.log("✅ تم تشغيل البوت المتكامل بنجاح!");
