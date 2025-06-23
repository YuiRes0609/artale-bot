// Artale Boss Timer Discord Bot with full slash command support
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Collection } = require('discord.js');
const fs = require('fs');
const path = './bosses.json';
const token = process.env.token;
const clientId = process.env.client_id;
const guildId = process.env.guild_id;

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

const commands = [
  new SlashCommandBuilder()
    .setName('addboss')
    .setDescription('新增王重生倒數')
    .addStringOption(option => option.setName('name').setDescription('王名').setRequired(true))
    .addStringOption(option => option.setName('channel').setDescription('分流（只輸入數字）').setRequired(true))
    .addIntegerOption(option => option.setName('minutes').setDescription('倒數分鐘').setRequired(true)),

  new SlashCommandBuilder()
    .setName('listboss')
    .setDescription('查看目前所有倒數中的王'),

  new SlashCommandBuilder()
    .setName('removeboss')
    .setDescription('移除某隻王')
    .addStringOption(option => option.setName('name').setDescription('王名').setRequired(true))
    .addStringOption(option => option.setName('channel').setDescription('分流（只輸入數字）').setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(token);

async function registerSlashCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ 已註冊斜線指令');
  } catch (error) {
    console.error('❌ 註冊斜線指令失敗:', error);
  }
}

client.once('ready', () => {
  loadBosses();
  registerSlashCommands();
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const { commandName } = interaction;

    if (commandName === 'addboss') {
      const name = interaction.options.getString('name');
      const channel = interaction.options.getString('channel');
      const minutes = interaction.options.getInteger('minutes');
      if (minutes <= 0) {
        await interaction.reply('⏱️ 倒數時間請輸入正確的分鐘數');
        return;
      }
      const endTime = Date.now() + minutes * 60000;
      bosses.push({ name, channel, endTime, channelId: interaction.channel.id });
      saveBosses();
      await interaction.reply(`✅ 已新增：${name}（ch${channel}）倒數 ${minutes} 分鐘`);
    }

    if (commandName === 'listboss') {
      await interaction.deferReply();
      if (bosses.length === 0) {
        await interaction.editReply('📭 目前沒有任何倒數中的王');
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
      await interaction.editReply(list);
    }

    if (commandName === 'removeboss') {
      const name = interaction.options.getString('name');
      const channel = interaction.options.getString('channel');
      const index = bosses.findIndex(b => b.name === name && b.channel === channel);
      if (index !== -1) {
        bosses.splice(index, 1);
        saveBosses();
        await interaction.reply(`🗑️ 已移除：${name}（ch${channel}）`);
      } else {
        await interaction.reply(`❌ 找不到 ${name}（ch${channel}）`);
      }
    }
  } catch (error) {
    console.error('❌ 發生錯誤：', error);
    if (interaction.deferred) {
      await interaction.editReply('❌ 發生錯誤，請稍後再試');
    } else {
      await interaction.reply('❌ 發生錯誤，請稍後再試');
    }
  }
});

client.login(token);

setInterval(() => {
  const now = Date.now();
  for (let i = bosses.length - 1; i >= 0; i--) {
    if (bosses[i].endTime <= now) {
      const boss = bosses[i];
      const channel = client.channels.cache.get(boss.channelId);
      if (channel) {
        channel.send(`🎉 ${boss.name}（ch${boss.channel}）已重生！快去刷夢想！`);
      }
      bosses.splice(i, 1);
      saveBosses();
    }
  }
}, 60000);
