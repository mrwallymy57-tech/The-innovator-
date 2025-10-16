// ===== إعدادات البوت =====
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// 🔹 توكن البوت (مؤقت - غيّره لاحقًا من @BotFather)
const TOKEN = '7660967028:AAHMkh-xHOC81n7pjhp_IuONwxE1G_72Oqo';
// 🔹 رقم الأدمن (ضع رقمك ID هنا)
const ADMIN_ID = 8457242337; // غيّر إلى رقمك من @userinfobot

// ===== إعداد السيرفر لـ Render =====
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🚀 البوت شغال بنجاح!'));
app.listen(PORT, () => console.log(`🌍 السيرفر يعمل على المنفذ ${PORT}`));

// ===== إنشاء البوت =====
const bot = new TelegramBot(TOKEN, { polling: true });

// ===== تحميل الأزرار من ملف =====
let buttons = [];
if (fs.existsSync('buttons.json')) {
  buttons = JSON.parse(fs.readFileSync('buttons.json'));
}

// ===== حفظ الأزرار =====
function saveButtons() {
  fs.writeFileSync('buttons.json', JSON.stringify(buttons, null, 2));
}

// ===== لوحة المستخدم =====
function getUserKeyboard() {
  return {
    reply_markup: {
      keyboard: buttons.map(b => [{ text: b }]),
      resize_keyboard: true
    }
  };
}

// ===== لوحة المدير =====
function getAdminKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '➕ إضافة زر' }, { text: '🗑️ حذف زر' }],
        [{ text: '📋 عرض الأزرار' }, { text: '🔙 رجوع' }]
      ],
      resize_keyboard: true
    }
  };
}

// ===== عند بدء البوت =====
bot.onText(/\/start/, (msg) => {
  if (msg.chat.id === ADMIN_ID) {
    bot.sendMessage(msg.chat.id, '👋 أهلاً أيها المدير!\nاختر إجراء:', getAdminKeyboard());
  } else {
    bot.sendMessage(msg.chat.id, '👋 أهلاً بك!\nاختر من الأزرار أدناه:', getUserKeyboard());
  }
});

// ===== منطق الأزرار =====
let adminState = {};

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // === الأزرار الخاصة بالمدير ===
  if (chatId === ADMIN_ID) {
    switch (text) {
      case '➕ إضافة زر':
        adminState[chatId] = 'adding';
        bot.sendMessage(chatId, '🟩 أرسل اسم الزر الجديد:');
        break;

      case '🗑️ حذف زر':
        if (buttons.length === 0) return bot.sendMessage(chatId, '⚠️ لا توجد أزرار للحذف.');
        adminState[chatId] = 'deleting';
        bot.sendMessage(chatId, 'اختر الزر الذي تريد حذفه:', {
          reply_markup: {
            keyboard: buttons.map(b => [{ text: `❌ ${b}` }]).concat([[{ text: '🔙 رجوع' }]]),
            resize_keyboard: true
          }
        });
        break;

      case '📋 عرض الأزرار':
        if (buttons.length === 0) {
          bot.sendMessage(chatId, '📭 لا توجد أزرار بعد.');
        } else {
          bot.sendMessage(chatId, '🧾 الأزرار الحالية:\n' + buttons.map(b => `• ${b}`).join('\n'));
        }
        break;

      case '🔙 رجوع':
        adminState[chatId] = null;
        bot.sendMessage(chatId, '⬅️ عدت إلى القائمة الرئيسية:', getAdminKeyboard());
        break;

      default:
        if (adminState[chatId] === 'adding') {
          const newBtn = text.trim();
          if (!newBtn) return bot.sendMessage(chatId, '❌ لا يمكن أن يكون الاسم فارغًا.');
          buttons.push(newBtn);
          saveButtons();
          adminState[chatId] = null;
          bot.sendMessage(chatId, `✅ تمت إضافة الزر "${newBtn}" بنجاح.`, getAdminKeyboard());
        } else if (adminState[chatId] === 'deleting') {
          if (text.startsWith('❌ ')) {
            const btnToDelete = text.replace('❌ ', '');
            buttons = buttons.filter(b => b !== btnToDelete);
            saveButtons();
            bot.sendMessage(chatId, `🗑️ تم حذف الزر "${btnToDelete}".`, getAdminKeyboard());
            adminState[chatId] = null;
          }
        }
        break;
    }
  }

  // === المستخدم العادي ===
  else {
    if (buttons.includes(text)) {
      bot.sendMessage(chatId, `✅ تم الضغط على الزر: ${text}`);
    } else if (text === '/start') {
      bot.sendMessage(chatId, '👋 أهلاً بك!\nاختر من الأزرار أدناه:', getUserKeyboard());
    }
  }
});

console.log('✅ تم تشغيل البوت بنجاح!');
