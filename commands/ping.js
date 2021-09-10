const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.addStringOption((option) =>
			option
				.setName('input')
				.setDescription('The input to echo back')
				.setRequired(false),
		),
	async execute(interaction) {
		await interaction.reply(interaction.options.getString('input') || 'Pong!');
	},
};
