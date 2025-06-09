const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('patrol')
        .setDescription('Announce an upcoming patrol with weather and temperature.')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time of the patrol (e.g., 7:00 PM EST)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('area')
                .setDescription('Patrol area (e.g., Sandy Shores)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the announcement in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to mention in the announcement')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('randomize_weather')
                .setDescription('Randomly choose weather and temperature?')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('weather')
                .setDescription('Weather condition (ignored if randomize is true)')
                .addChoices(
                    { name: 'Clear', value: 'Clear' },
                    { name: 'Cloudy', value: 'Cloudy' },
                    { name: 'Rain', value: 'Rain' },
                    { name: 'Thunderstorm', value: 'Thunderstorm' },
                    { name: 'Snow', value: 'Snow' }
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('temperature')
                .setDescription('Temperature (ignored if randomize is true)')
                .addChoices(
                    { name: 'Hot', value: 'Hot' },
                    { name: 'Warm', value: 'Warm' },
                    { name: 'Cool', value: 'Cool' },
                    { name: 'Cold', value: 'Cold' },
                    { name: 'Freezing', value: 'Freezing' }
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Additional notes or details')
                .setRequired(false)),

    async execute(interaction) {
        const time = interaction.options.getString('time');
        const area = interaction.options.getString('area');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const randomize = interaction.options.getBoolean('randomize_weather') ?? false;
        const manualWeather = interaction.options.getString('weather');
        const manualTemp = interaction.options.getString('temperature');
        const notes = interaction.options.getString('notes') || '*No additional info provided.*';

        // Weather & temp handling
        const weather = randomize ? rollWeightedWeather() : (manualWeather || 'Clear');
        const tempCategory = randomize ? rollWeightedTemp(weather) : (manualTemp || 'Warm');
        const forecast = generateWeatherForecast(weather, tempCategory);

        const embed = new EmbedBuilder()
            .setTitle('🚨 Patrol News Bulletin')
            .setDescription(`A patrol is scheduled and you're invited to roll out.`)
            .addFields(
                { name: '🕒 Time', value: time, inline: true },
                { name: '🌐 Area', value: area, inline: true },
                { name: '🌦️ Weather Forecast', value: forecast.sentence, inline: false },
                { name: '📋 Notes', value: notes }
            )
            .setColor(0xff0000)
            .setFooter({ text: 'React below with your availability.' });

        try {
            const announcement = await channel.send({
                content: `${role}`,
                embeds: [embed]
            });

            await announcement.react('✅');
            await announcement.react('❔');
            await announcement.react('❌');

            await interaction.reply({
                content: `📣 Patrol announced in ${channel} with weather "${weather}" and temperature "${forecast.numericTemp}°F".`,
                flags: 64
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: '❌ Failed to send the patrol announcement. Check my permissions in that channel.',
                flags: 64
            });
        }
    },
};

// Weighted weather selection
function rollWeightedWeather() {
    const weights = [
        { value: 'Clear', weight: 5 },
        { value: 'Cloudy', weight: 5 },
        { value: 'Rain', weight: 5 },
        { value: 'Thunderstorm', weight: 5 },
        { value: 'Snow', weight: 80 }
    ];
    return pickWeighted(weights);
}

// Weighted temperature category selection
function rollWeightedTemp(weather) {
    if(weather == "Snow") {
        const weights = [
            { value: 'Cold', weight: 50 },
            { value: 'Freezing', weight: 30 },
            { value: 'Cool', weight: 20 }
        ];
        return pickWeighted(weights);
    } else {
        const weights = [
            { value: 'Warm', weight: 35 },
            { value: 'Cool', weight: 25 },
            { value: 'Hot', weight: 25 },
            { value: 'Cold', weight: 10 },
            { value: 'Freezing', weight: 5 }
        ];
        return pickWeighted(weights);
    }
    
}

// Weighted picker
function pickWeighted(options) {
    const total = options.reduce((sum, opt) => sum + opt.weight, 0);
    const rand = Math.random() * total;
    let running = 0;
    for (const opt of options) {
        running += opt.weight;
        if (rand < running) return opt.value;
    }
    return options[0].value;
}

// Actual weather forecast sentence and temperature
function generateWeatherForecast(weather, category) {
    const windDirections = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const wind = windDirections[Math.floor(Math.random() * windDirections.length)];
    const temp = rollActualTemp(category);

    const conditionDescription = {
        Clear: 'Clear skies expected',
        Cloudy: 'Overcast skies throughout the evening',
        Rain: 'Intermittent rain showers likely',
        Thunderstorm: 'Thunderstorms possible in the area',
        Snow: 'Snowfall expected, drive carefully'
    };

    return {
        sentence: `${conditionDescription[weather]}. High of **${temp}°F**. Light wind from the ${wind}.`,
        numericTemp: temp
    };
}

// Temperature value based on category
function rollActualTemp(category) {
    const ranges = {
        Hot: [85, 100],
        Warm: [70, 84],
        Cool: [55, 69],
        Cold: [40, 54],
        Freezing: [20, 39]
    };
    const [min, max] = ranges[category] || [70, 84];
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
