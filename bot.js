// bot.js - بوت تلغرام احترافي كامل بملف واحد
// -----------------------------------------------------

const fs = require("fs");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

// 🔑 توكن البوت الخاص بك
const TOKEN = "7660967028:AAHMkh-xHOC81n7pjhp_IuONwxE1G_72Oqo";

// ✅ إنشاء كائن البوت
const bot = new TelegramBot(TOKEN, { polling: true });

// 🌐 إعداد السيرفر لـ Render
const app = express();
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => res.send("✅ البوت يعمل بنجاح!"));
app.listen(PORT, () => console.log(`🌍 السيرفر يعمل على المنفذ ${PORT}`));

// 📁 تحميل الأزرار من ملف (للحفظ بعد إعادة التشغيل)
let customButtons = [];
const BUTTONS_FILE = "./buttons.json";

if (fs.existsSync(BUTTONS_FILE)) {
  try {
    const data = fs.readFileSync(BUTTONS_FILE, "utf8");
    customButtons = JSON.parse(data);
  } catch (err) {
    console.error("❌ خطأ في قراءة الأزرار:", err);
  }
}

// 🔄 حفظ الأزرار عند التعديل
function saveButtons() {
  fs.writeFileSync(BUTTONS_FILE, JSON.stringify(customButtons, null, 2));
}

// 🟢 عند كتابة /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "👋 أهلاً بك في *بوت الأزرار المتعددة!*\n\nيمكنك إضافة أزرار جديدة بسهولة، أو عرض الأزرار الحالية.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 عرض الأزرار", callback_data: "show_buttons" }],
          [{ text: "➕ إضافة زر جديد", callback_data: "add_button" }],
          [{ text: "ℹ️ حول البوت", callback_data: "about" }],
        ],
      },
    }
  );
});

// 🧠 التعامل مع الضغط على الأزرار
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "show_buttons") {
    showButtons(chatId);
  } 
  else if (data === "about") {
    bot.sendMessage(
      chatId,
      "🤖 *بوت الأزرار الذكي*\nتم تطويره باستخدام Node.js ويعمل على Render.com.\n\nيمكنك إضافة عدد غير محدود من الأزرار مع نصوص مخصصة.",
      { parse_mode: "Markdown" }
    );
  } 
  else if (data === "add_button") {
    bot.sendMessage(
      chatId,
      "📝 أرسل اسم الزر متبوعاً بالنص المطلوب عند الضغط عليه.\n📌 الصيغة:\n`اسم الزر | النص`",
      { parse_mode: "Markdown" }
    );

    bot.once("message", (msg) => {
      const text = msg.text;
      if (!text.includes("|")) {
        return bot.sendMessage(
          chatId,
          "❌ الصيغة غير صحيحة.\nاكتب بهذا الشكل:\n`اسم الزر | النص`",
          { parse_mode: "Markdown" }
        );
      }

      const [btnName, btnText] = text.split("|").map((t) => t.trim());

      // 🔘 حفظ الزر الجديد
      customButtons.push({ name: btnName, text: btnText });
      saveButtons();

      bot.sendMessage(chatId, `✅ تمت إضافة الزر *${btnName}* بنجاح!`, {
        parse_mode: "Markdown",
      });

      showButtons(chatId);
    });
  } 
  else {
    // 📩 عند الضغط على زر مخصص
    const found = customButtons.find((b) => b.name === data);
    if (found) {
      bot.sendMessage(chatId, `💬 ${found.text}`);
    }
  }
});

// 📋 دالة عرض كل الأزرار
function showButtons(chatId) {
  if (customButtons.length === 0) {
    bot.sendMessage(chatId, "⚠️ لا توجد أزرار حالياً. أضف زر جديد أولاً.");
    return;
  }

  const keyboard = customButtons.map((b) => [{ text: b.name, callback_data: b.name }]);
  bot.sendMessage(chatId, "📋 الأزرار المتوفرة:", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

console.log("✅ تم تشغيل البوت بنجاح!");
