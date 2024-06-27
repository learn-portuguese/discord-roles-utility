const fs = require('fs')
const Discord = require('discord.js')
const jsum = require('jsum')
const json2md = require('json2md')

json2md.converters.categories = (input, parser) => `# Categories\n\n${input.map((v, i) => `## Category \#${i+1}\n\n${parser(v)}`).join('\n')}`
json2md.converters.c = (input, _) => `### Channels\n\n${input.map((v) => `- \`${v}\``).join('\n')}`
json2md.converters.o = (input, parser) => (input.length === 0) ? '' : `### Overwrites\n\n${Object.entries(input).map(([role, overwrites]) => `#### Role \`${role}\`\n\n${parser(overwrites)}`).join('\n')}`
json2md.converters.a = (input, _) => (input.length === 0) ? '' : `Allow:\n\n${input.map((v) => `- \`${v}\``).join('\n')}`
json2md.converters.d = (input, _) => (input.length === 0) ? '' : `\nDeny:\n\n${input.map((v) => `- \`${v}\``).join('\n')}`

const { USER_ID, TOKEN } = process.env

let client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent, Discord.GatewayIntentBits.GuildMembers, Discord.GatewayIntentBits.GuildModeration] })

client.on('ready', async () => {
  console.log('> logged in as', client.user.tag)
})

client.on('messageCreate', async (/** @type {Discord.Message} */ message) => {
  if (message.author.id !== USER_ID) return
  let args = message.cleanContent.split(/\s+/)
  switch (args.shift()) {
    case '$record': return await handleRecord(message, args)
    default: return
  }
})

/**
 * @param {Discord.Message} message
 */
async function handleRecord(message, _) {
  let permsMap = new Map()
  let guild = message.guild

  for (let [_, channel] of guild.channels.cache.filter((c) => !c.isThread())) {
    let channelObj = {}
    console.log(`> visitting ${channel.name}`)
    if (!channel.permissionOverwrites || !channel.permissionOverwrites.cache) continue
    for (let [roleId, perms] of channel.permissionOverwrites.cache) {
      let key = guild.roles.cache.get(roleId).name
      channelObj[key] = {
        a: perms.allow.toArray(),
        d: perms.deny.toArray()
      }
    }

    let hash = jsum.digest(channelObj, 'SHA256', 'hex')
    if (!permsMap.has(hash)) {
      permsMap.set(hash, {
        c: [],
        o: channelObj
      })
    }

    permsMap.get(hash)['c'].push(channel.name)
  }

  let json = { categories: [] }
  for (let [_, obj] of permsMap) {
    json.categories.push(obj)
  }

  fs.writeFileSync('categories.json', JSON.stringify(json, null, 2))
  fs.writeFileSync('categories.md', json2md(json))
  console.log('> categories saved')
}

client.login(TOKEN)