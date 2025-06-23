// Artale Boss Timer Discord Bot (with list, remove, help, and JSON persistence)
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = './bosses.json';
const token = process.env.token;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let bosses = [];

function saveBosses() {
  fs.writeFileSync(path, JSON.stringify(bosses, null, 2));
}

function loadBosses() {
  if (fs.existsSync(path)) {
    try {
      bosses = JSON.parse(fs.readFileSync(path));
    } catch (e) {
      console.error('❌ 無法讀取 bosses.json：', e);
      bosses = [];
    }
  }
}

client.once('ready', () => {
  loadBosses();
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'addboss') {
    if (args.length < 3) {
      message.channel.send('❗ 格式錯誤：!addboss 王名 分流 倒數分鐘');
      return;
    }
    const [name, channel, durationStr] = args;
    const duration = parseInt(durationStr);
    if (isNaN(duration) || duration <= 0) {
      message.channel.send('⏱️ 倒數時間請輸入正確的分鐘數');
      return;
    }
    const endTime = Date.now() + duration * 60000;
    bosses.push({ name, channel, endTime, channelId: message.channel.id });
    saveBosses();
    message.channel.send(`✅ 已新增：${name}（ch${channel}）倒數 ${duration} 分鐘`);
  }

  else if (command === 'listboss') {
    if (bosses.length === 0) {
      message.channel.send('📭 目前沒有任何倒數中的王');
      return;
    }
    let list = '📋 倒數中的王：\n';
    bosses.forEach(boss => {
      const remaining = boss.endTime - Date.now();
      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        list += `• ${boss.name}（ch${boss.channel}） 剩 ${minutes}分 ${seconds}秒\n`;
      }
    });
    message.channel.send(list);
  }

  else if (command === 'removeboss') {
    if (args.length < 2) {
      message.channel.send('❗ 格式錯誤：!removeboss 王名 分流');
      return;
    }
    const [name, channel] = args;
    const index = bosses.findIndex(b => b.name === name && b.channel === channel);
    if (index !== -1) {
      bosses.splice(index, 1);
      saveBosses();
      message.channel.send(`🗑️ 已移除：${name}（ch${channel}）`);
    } else {
      message.channel.send(`❌ 找不到 ${name}（ch${channel}）`);
    }
  }

  else if (command === 'help') {
    const helpText = `📖 可用指令：\n\n` +
      `!addboss 王名 分流 倒數分鐘 - 登記一隻王的重生倒數\n` +
      `!listboss - 查看目前所有倒數中的王\n` +
      `!removeboss 王名 分流 - 手動移除某隻王\n` +
      `!help - 顯示這個說明`; 
    message.channel.send(helpText);
  }
});

setInterval(() => {
  const now = Date.now();
  for (let i = bosses.length - 1; i >= 0; i--) {
    if (bosses[i].endTime <= now) {
      const boss = bosses[i];
      const channel = client.channels.cache.get(boss.channelId);
      if (channel) {
        channel.send(`🎉 ${boss.name}（ch${boss.channel}）已重生！快去刷！`);
      }
      bosses.splice(i, 1);
      saveBosses();
    }
  }
}, 60000);

client.login(token);
