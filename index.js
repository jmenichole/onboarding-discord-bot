require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Store user onboarding progress
const userProgress = new Map();

client.once('ready', () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
});

// Welcome new members
client.on('guildMemberAdd', async (member) => {
  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('🎉 Welcome to the Server!')
    .setDescription(`Hey ${member.user.username}! Let's get you onboarded.`)
    .addFields(
      { name: '📋 Step 1', value: 'Review our website and services', inline: true },
      { name: '💬 Step 2', value: 'Complete the onboarding form', inline: true },
      { name: '🤝 Step 3', value: 'Schedule a consultation call', inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🌐 Visit Website')
        .setURL(process.env.WEBSITE_URL || 'https://mischiefmanager.org')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setCustomId('start_onboarding')
        .setLabel('🚀 Start Onboarding')
        .setStyle(ButtonStyle.Primary)
    );

  try {
    await member.send({ embeds: [welcomeEmbed], components: [row] });
  } catch (error) {
    console.log(`Could not DM ${member.user.tag}`);
    // Fallback to channel message if DM fails
    const channel = member.guild.systemChannel;
    if (channel) {
      await channel.send({ content: `${member}`, embeds: [welcomeEmbed], components: [row] });
    }
  }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;

  if (interaction.customId === 'start_onboarding') {
    userProgress.set(userId, { step: 1, startTime: Date.now() });

    const onboardingEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📝 Onboarding Process Started')
      .setDescription('Please complete the following steps:')
      .addFields(
        { name: '1️⃣ Business Information', value: 'Tell us about your business needs', inline: false },
        { name: '2️⃣ Project Requirements', value: 'Describe your project scope', inline: false },
        { name: '3️⃣ Timeline & Budget', value: 'Share your timeline and budget range', inline: false }
      )
      .setFooter({ text: 'Complete each step to proceed' });

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('business_info')
          .setLabel('1️⃣ Business Info')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('project_requirements')
          .setLabel('2️⃣ Project Details')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('timeline_budget')
          .setLabel('3️⃣ Timeline & Budget')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [onboardingEmbed], components: [actionRow], ephemeral: true });
  }

  // Handle individual onboarding steps
  if (['business_info', 'project_requirements', 'timeline_budget'].includes(interaction.customId)) {
    const stepMessages = {
      business_info: 'Please describe your business and what services you need.',
      project_requirements: 'What specific features or functionality do you need?',
      timeline_budget: 'What is your preferred timeline and budget range?'
    };

    await interaction.reply({
      content: `📝 **Step ${interaction.customId === 'business_info' ? '1' : interaction.customId === 'project_requirements' ? '2' : '3'}:**\n\n${stepMessages[interaction.customId]}\n\n*Please type your response in this channel.*`,
      ephemeral: true
    });

    // Update user progress
    const progress = userProgress.get(userId) || { step: 0 };
    progress[interaction.customId] = true;
    userProgress.set(userId, progress);
  }
});

// Handle text responses for onboarding
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const progress = userProgress.get(userId);

  if (progress && message.channel.type === 1) { // DM channel
    const completedSteps = Object.keys(progress).filter(key => key !== 'step' && key !== 'startTime' && progress[key]).length;
    
    if (completedSteps >= 3) {
      const completionEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Onboarding Complete!')
        .setDescription('Thank you for completing the onboarding process!')
        .addFields(
          { name: '📞 Next Steps', value: 'A team member will contact you within 24 hours to schedule a consultation.' },
          { name: '💬 Questions?', value: 'Feel free to ask in the server or DM an admin.' }
        )
        .setTimestamp();

      await message.reply({ embeds: [completionEmbed] });
      userProgress.delete(userId);
    } else {
      await message.react('✅');
      await message.reply('Thank you for your response! Please complete the remaining steps.');
    }
  }
});

// Slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'onboard') {
    // Trigger onboarding manually
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🚀 Manual Onboarding')
      .setDescription('Click the button below to start your onboarding process.');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('start_onboarding')
          .setLabel('Start Onboarding')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
});

client.login(process.env.DISCORD_TOKEN);