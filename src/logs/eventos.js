// Escuta tudo o que acontece no servidor e manda para os canais de log.
const db = require('../db');
const L = require('./nucleo');

const { enviar, embed, corta, vazio, quando, pessoa, quem, AuditLogEvent: A } = L;

const TIPOS_CANAL = { 0: 'texto', 2: 'voz', 4: 'categoria', 5: 'anúncios', 13: 'palco', 15: 'fórum', 16: 'mídia' };
const tipoCanal = (c) => TIPOS_CANAL[c.type] || 'canal';
const nomeCanal = (c) => (c ? `<#${c.id}> (${c.name || 'canal'})` : 'desconhecido');
const canalIgnorado = (c) => !!c && (L.ignorados().includes(c.id) || (c.parentId && L.ignorados().includes(c.parentId)) || L.canaisDeLog().has(c.id));
const lista = (itens, vazioTxt = '—') => (itens.length ? corta(itens.join(', '), 1000) : vazioTxt);
const porQuem = (info) => (info && info.executor ? ['Por', pessoa(info.executor), true] : null);
const motivo = (info, extra) => { const m = extra || (info && info.motivo); return m ? ['Motivo', m] : null; };

function opcoesTexto(data) {
  return (data || []).map((o) => {
    if (o.options) return `${o.name} ${opcoesTexto(o.options)}`.trim();
    const v = o.type === 6 ? `<@${o.value}>` : o.type === 7 ? `<#${o.value}>` : o.type === 8 ? `<@&${o.value}>` : o.value;
    return `${o.name}:${v}`;
  }).join(' ');
}

function assinaturaOverwrites(c) {
  const cache = c.permissionOverwrites && c.permissionOverwrites.cache;
  if (!cache) return '';
  return [...cache.values()].map((o) => `${o.id}:${o.allow && o.allow.bitfield}:${o.deny && o.deny.bitfield}`).sort().join('|');
}

function registrar(client) {
  const eu = () => client.user && client.user.id;
  const seguro = (nome, fn) => (...args) => Promise.resolve().then(() => fn(...args)).catch((e) => console.error(`[Logs] ${nome}:`, e));
  const on = (evento, fn) => client.on(evento, seguro(evento, fn));
  const foiEuMesmo = (info) => !!(info && info.executor && info.executor.id === eu());

  // ---------- Membros ----------
  on('guildMemberAdd', async (m) => {
    const nova = Date.now() - m.user.createdTimestamp < 7 * 86400000;
    await enviar(m.guild, 'membros', embed('verde', '📥 Membro entrou', `${pessoa(m.user)} entrou no servidor.`, [
      ['Conta criada', `${quando(m.user.createdTimestamp)}${nova ? ' ⚠️ conta nova' : ''}`, true],
      ['ID', m.id, true],
      ['Total de membros', m.guild.memberCount, true],
    ]));
  });

  on('guildMemberRemove', async (m) => {
    const cargos = m.roles ? [...m.roles.cache.values()].filter((r) => r.id !== m.guild.id).map((r) => `<@&${r.id}>`) : [];
    await enviar(m.guild, 'membros', embed('vermelho', '📤 Membro saiu', `${pessoa(m.user)} saiu do servidor.`, [
      ['Estava desde', m.joinedTimestamp ? quando(m.joinedTimestamp) : '—', true],
      ['ID', m.id, true],
      ['Cargos', lista(cargos, 'nenhum')],
    ]));
    const info = await quem(m.guild, A.MemberKick, m.id);
    if (info) {
      await enviar(m.guild, 'moderacao', embed('amarelo', '👢 Membro expulso', `${pessoa(m.user)} foi expulso.`, [porQuem(info), motivo(info)]));
    }
  });

  on('guildMemberUpdate', async (antes, depois) => {
    if (antes.partial) return;
    const g = depois.guild;
    const quemE = pessoa(depois.user);

    if (antes.nickname !== depois.nickname) {
      await enviar(g, 'membros', embed('azul', '✏️ Apelido alterado', quemE, [
        ['Antes', antes.nickname || '(nenhum)', true], ['Depois', depois.nickname || '(nenhum)', true],
      ]));
    }

    const add = [...depois.roles.cache.values()].filter((r) => !antes.roles.cache.has(r.id));
    const rem = [...antes.roles.cache.values()].filter((r) => !depois.roles.cache.has(r.id));
    if (add.length || rem.length) {
      const info = await quem(g, A.MemberRoleUpdate, depois.id);
      await enviar(g, 'membros', embed('azul', '🏷️ Cargos alterados', quemE, [
        add.length ? ['Adicionados', lista(add.map((r) => `<@&${r.id}>`))] : null,
        rem.length ? ['Removidos', lista(rem.map((r) => `<@&${r.id}>`))] : null,
        porQuem(info),
      ]));
    }

    const a = antes.communicationDisabledUntilTimestamp || 0;
    const d = depois.communicationDisabledUntilTimestamp || 0;
    if (a !== d) {
      const info = await quem(g, A.MemberUpdate, depois.id);
      if (d > Date.now()) {
        await enviar(g, 'moderacao', embed('amarelo', '⏳ Membro castigado (timeout)', quemE, [
          ['Até', `<t:${Math.floor(d / 1000)}:f> (${quando(d)})`], porQuem(info), motivo(info),
        ]));
      } else if (a > Date.now()) {
        await enviar(g, 'moderacao', embed('verde', '✅ Castigo removido', quemE, [porQuem(info)]));
      }
    }
  });

  // ---------- Moderação ----------
  on('guildBanAdd', async (ban) => {
    const b = ban.partial ? await ban.fetch().catch(() => ban) : ban;
    const info = await quem(b.guild, A.MemberBanAdd, b.user.id);
    await enviar(b.guild, 'moderacao', embed('vermelho', '🔨 Membro banido', pessoa(b.user), [porQuem(info), motivo(info, b.reason)]));
  });

  on('guildBanRemove', async (ban) => {
    const info = await quem(ban.guild, A.MemberBanRemove, ban.user.id);
    await enviar(ban.guild, 'moderacao', embed('verde', '♻️ Ban removido', pessoa(ban.user), [porQuem(info)]));
  });

  // ---------- Mensagens ----------
  on('messageDelete', async (msg) => {
    if (!msg.guild || (msg.author && msg.author.bot) || canalIgnorado(msg.channel)) return;
    const info = msg.author ? await quem(msg.guild, A.MessageDelete, msg.author.id, { filtro: (e) => !e.extra || !e.extra.channel || e.extra.channel.id === msg.channelId }) : null;
    const anexos = msg.attachments ? [...msg.attachments.values()].map((x) => x.url) : [];
    await enviar(msg.guild, 'mensagens', embed('vermelho', '🗑️ Mensagem apagada', corta(msg.content || '(sem texto, ou a mensagem não estava na memória do bot)', 3000), [
      ['Autor', msg.author ? pessoa(msg.author) : 'desconhecido', true],
      ['Canal', nomeCanal(msg.channel), true],
      info && info.executor ? ['Apagada por', pessoa(info.executor), true] : null,
      anexos.length ? ['Anexos', anexos.join('\n')] : null,
      ['ID da mensagem', msg.id, true],
    ]));
  });

  on('messageUpdate', async (antes, depois) => {
    if (!depois.guild || (depois.author && depois.author.bot) || canalIgnorado(depois.channel)) return;
    if (antes.partial || antes.content === null || antes.content === depois.content) return;
    await enviar(depois.guild, 'mensagens', embed('amarelo', '✏️ Mensagem editada', `[Ir para a mensagem](${depois.url})`, [
      ['Autor', pessoa(depois.author), true],
      ['Canal', nomeCanal(depois.channel), true],
      ['Antes', vazio(antes.content)],
      ['Depois', vazio(depois.content)],
    ]));
  });

  on('messageDeleteBulk', async (mensagens, canal) => {
    if (!canal || !canal.guild || canalIgnorado(canal)) return;
    const autores = new Map();
    for (const m of mensagens.values()) {
      if (m.author) autores.set(m.author.id, (autores.get(m.author.id) || 0) + 1);
    }
    const top = [...autores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => `<@${id}>: ${n}`);
    await enviar(canal.guild, 'mensagens', embed('vermelho', '🧹 Mensagens apagadas em massa', `**${mensagens.size}** mensagens apagadas em ${nomeCanal(canal)}.`, [
      top.length ? ['Autores (das que estavam na memória)', top.join('\n')] : null,
    ]));
  });

  // ---------- Voz ----------
  on('voiceStateUpdate', async (antes, depois) => {
    const m = depois.member || antes.member;
    if (!m || m.user.bot) return;
    const g = depois.guild || antes.guild;
    const quemE = pessoa(m.user);
    if (antes.channelId !== depois.channelId) {
      if (!antes.channelId) {
        if (!canalIgnorado(depois.channel)) await enviar(g, 'voz', embed('verde', '🔊 Entrou em uma call', quemE, [['Canal', nomeCanal(depois.channel)]]));
      } else if (!depois.channelId) {
        if (!canalIgnorado(antes.channel)) await enviar(g, 'voz', embed('vermelho', '🔇 Saiu da call', quemE, [['Canal', nomeCanal(antes.channel)]]));
      } else {
        await enviar(g, 'voz', embed('azul', '🔀 Mudou de call', quemE, [['De', nomeCanal(antes.channel), true], ['Para', nomeCanal(depois.channel), true]]));
      }
      return;
    }
    if (antes.serverMute !== depois.serverMute) {
      await enviar(g, 'voz', embed('amarelo', depois.serverMute ? '🎙️ Silenciado por um moderador' : '🎙️ Microfone liberado', quemE, [['Canal', nomeCanal(depois.channel)]]));
    }
    if (antes.serverDeaf !== depois.serverDeaf) {
      await enviar(g, 'voz', embed('amarelo', depois.serverDeaf ? '🎧 Ensurdecido por um moderador' : '🎧 Áudio liberado', quemE, [['Canal', nomeCanal(depois.channel)]]));
    }
    if (antes.streaming !== depois.streaming) {
      await enviar(g, 'voz', embed('azul', depois.streaming ? '📺 Começou uma transmissão' : '📺 Parou a transmissão', quemE, [['Canal', nomeCanal(depois.channel)]]));
    }
  });

  // ---------- Canais ----------
  on('channelCreate', async (c) => {
    if (!c.guild) return;
    const info = await quem(c.guild, A.ChannelCreate, c.id);
    if (foiEuMesmo(info)) return; // canais que o próprio Atlas cria (recepção, tickets...)
    await enviar(c.guild, 'canais', embed('verde', '📁 Canal criado', nomeCanal(c), [['Tipo', tipoCanal(c), true], porQuem(info)]));
  });

  on('channelDelete', async (c) => {
    if (!c.guild) return;
    const info = await quem(c.guild, A.ChannelDelete, c.id);
    if (foiEuMesmo(info)) return;
    await enviar(c.guild, 'canais', embed('vermelho', '🗑️ Canal apagado', `**#${c.name}**`, [['Tipo', tipoCanal(c), true], porQuem(info)]));
  });

  on('channelUpdate', async (antes, depois) => {
    if (!depois.guild) return;
    const dif = [];
    if (antes.name !== depois.name) dif.push(['Nome', `${antes.name} → ${depois.name}`]);
    if ((antes.topic || '') !== (depois.topic || '')) dif.push(['Tópico', `${vazio(antes.topic)} → ${vazio(depois.topic)}`]);
    if (antes.nsfw !== depois.nsfw) dif.push(['Conteúdo adulto', `${antes.nsfw ? 'sim' : 'não'} → ${depois.nsfw ? 'sim' : 'não'}`]);
    if (antes.rateLimitPerUser !== depois.rateLimitPerUser) dif.push(['Modo lento', `${antes.rateLimitPerUser || 0}s → ${depois.rateLimitPerUser || 0}s`]);
    if (antes.parentId !== depois.parentId) dif.push(['Categoria', `${antes.parentId ? `<#${antes.parentId}>` : 'nenhuma'} → ${depois.parentId ? `<#${depois.parentId}>` : 'nenhuma'}`]);
    if (antes.bitrate !== depois.bitrate) dif.push(['Bitrate', `${antes.bitrate} → ${depois.bitrate}`]);
    if (antes.userLimit !== depois.userLimit) dif.push(['Limite de pessoas', `${antes.userLimit || '∞'} → ${depois.userLimit || '∞'}`]);
    const permissoes = assinaturaOverwrites(antes) !== assinaturaOverwrites(depois);
    if (permissoes) dif.push(['Permissões', 'As permissões do canal foram alteradas.']);
    if (!dif.length) return;

    let info = await quem(depois.guild, A.ChannelUpdate, depois.id);
    if (!info && permissoes) {
      for (const t of [A.ChannelOverwriteUpdate, A.ChannelOverwriteCreate, A.ChannelOverwriteDelete]) {
        info = await quem(depois.guild, t, depois.id, { espera: 0 });
        if (info) break;
      }
    }
    if (foiEuMesmo(info)) return; // ex.: fechamento noturno
    await enviar(depois.guild, 'canais', embed('amarelo', '🛠️ Canal alterado', nomeCanal(depois), [...dif, porQuem(info)]));
  });

  on('threadCreate', async (t) => {
    if (!t.guild) return;
    await enviar(t.guild, 'canais', embed('verde', '🧵 Tópico criado', `**${t.name}** em ${t.parentId ? `<#${t.parentId}>` : 'um canal'}`, [
      t.ownerId ? ['Criado por', `<@${t.ownerId}>`, true] : null,
    ]));
  });

  on('threadDelete', async (t) => {
    if (!t.guild) return;
    await enviar(t.guild, 'canais', embed('vermelho', '🧵 Tópico apagado', `**${t.name}**`));
  });

  // ---------- Cargos ----------
  on('roleCreate', async (r) => {
    const info = await quem(r.guild, A.RoleCreate, r.id);
    await enviar(r.guild, 'cargos', embed('verde', '🏷️ Cargo criado', `<@&${r.id}> (${r.name})`, [porQuem(info)]));
  });

  on('roleDelete', async (r) => {
    const info = await quem(r.guild, A.RoleDelete, r.id);
    await enviar(r.guild, 'cargos', embed('vermelho', '🗑️ Cargo apagado', `**${r.name}**`, [porQuem(info)]));
  });

  on('roleUpdate', async (antes, depois) => {
    const dif = [];
    if (antes.name !== depois.name) dif.push(['Nome', `${antes.name} → ${depois.name}`]);
    if (antes.color !== depois.color) dif.push(['Cor', `#${antes.color.toString(16).padStart(6, '0')} → #${depois.color.toString(16).padStart(6, '0')}`]);
    if (antes.hoist !== depois.hoist) dif.push(['Separado na lista', depois.hoist ? 'ligado' : 'desligado']);
    if (antes.mentionable !== depois.mentionable) dif.push(['Pode ser mencionado', depois.mentionable ? 'sim' : 'não']);
    if (antes.permissions.bitfield !== depois.permissions.bitfield) {
      const ganhou = antes.permissions.missing(depois.permissions);
      const perdeu = depois.permissions.missing(antes.permissions);
      if (ganhou.length) dif.push(['Permissões ganhas', ganhou.join(', ')]);
      if (perdeu.length) dif.push(['Permissões perdidas', perdeu.join(', ')]);
    }
    if (!dif.length) return;
    const info = await quem(depois.guild, A.RoleUpdate, depois.id);
    await enviar(depois.guild, 'cargos', embed('amarelo', '🛠️ Cargo alterado', `<@&${depois.id}> (${depois.name})`, [...dif, porQuem(info)]));
  });

  // ---------- Servidor ----------
  on('guildUpdate', async (antes, depois) => {
    const dif = [];
    if (antes.name !== depois.name) dif.push(['Nome', `${antes.name} → ${depois.name}`]);
    if (antes.icon !== depois.icon) dif.push(['Ícone', 'O ícone do servidor foi alterado.']);
    if (antes.banner !== depois.banner) dif.push(['Banner', 'O banner do servidor foi alterado.']);
    if (antes.ownerId !== depois.ownerId) dif.push(['Dono', `<@${antes.ownerId}> → <@${depois.ownerId}>`]);
    if (antes.verificationLevel !== depois.verificationLevel) dif.push(['Nível de verificação', `${antes.verificationLevel} → ${depois.verificationLevel}`]);
    if (antes.afkChannelId !== depois.afkChannelId) dif.push(['Canal AFK', `${antes.afkChannelId ? `<#${antes.afkChannelId}>` : 'nenhum'} → ${depois.afkChannelId ? `<#${depois.afkChannelId}>` : 'nenhum'}`]);
    if (antes.systemChannelId !== depois.systemChannelId) dif.push(['Canal de avisos do sistema', `${antes.systemChannelId ? `<#${antes.systemChannelId}>` : 'nenhum'} → ${depois.systemChannelId ? `<#${depois.systemChannelId}>` : 'nenhum'}`]);
    if (!dif.length) return;
    const info = await quem(depois, A.GuildUpdate, null);
    await enviar(depois, 'servidor', embed('amarelo', '⚙️ Servidor alterado', null, [...dif, porQuem(info)]));
  });

  on('emojiCreate', async (e) => {
    const info = await quem(e.guild, A.EmojiCreate, e.id);
    await enviar(e.guild, 'servidor', embed('verde', '😀 Emoji criado', `${e.toString()} \`:${e.name}:\``, [porQuem(info)]));
  });
  on('emojiDelete', async (e) => {
    const info = await quem(e.guild, A.EmojiDelete, e.id);
    await enviar(e.guild, 'servidor', embed('vermelho', '😶 Emoji apagado', `\`:${e.name}:\``, [porQuem(info)]));
  });
  on('emojiUpdate', async (antes, depois) => {
    if (antes.name === depois.name) return;
    await enviar(depois.guild, 'servidor', embed('amarelo', '😀 Emoji renomeado', `${depois.toString()}`, [['Nome', `:${antes.name}: → :${depois.name}:`]]));
  });

  on('inviteCreate', async (i) => {
    if (!i.guild) return;
    await enviar(i.guild, 'servidor', embed('verde', '🔗 Convite criado', `\`${i.code}\``, [
      ['Por', i.inviter ? pessoa(i.inviter) : 'desconhecido', true],
      ['Canal', i.channel ? nomeCanal(i.channel) : '—', true],
      ['Usos máximos', i.maxUses || 'ilimitado', true],
      ['Expira', i.expiresTimestamp ? quando(i.expiresTimestamp) : 'nunca', true],
    ]));
  });
  on('inviteDelete', async (i) => {
    if (!i.guild) return;
    await enviar(i.guild, 'servidor', embed('vermelho', '🔗 Convite apagado', `\`${i.code}\``, [['Canal', i.channel ? nomeCanal(i.channel) : '—']]));
  });

  // ---------- Comandos ----------
  on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand || !i.isChatInputCommand() || !i.guild || canalIgnorado(i.channel)) return;
    const texto = `/${i.commandName} ${opcoesTexto(i.options && i.options.data)}`.trim();
    await enviar(i.guild, 'comandos', embed('rosa', '⌨️ Comando usado', `\`${corta(texto, 900)}\``, [
      ['Quem', pessoa(i.user), true], ['Canal', nomeCanal(i.channel), true],
    ]));
  });

  on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot || canalIgnorado(msg.channel)) return;
    const prefixo = db.get('config.prefixo', '!');
    if (!msg.content.startsWith(prefixo)) return;
    const nome = msg.content.slice(prefixo.length).trim().split(/\s+/)[0];
    if (!nome || !client.commands.has(nome.toLowerCase())) return;
    await enviar(msg.guild, 'comandos', embed('rosa', '⌨️ Comando usado (por texto)', `\`${corta(msg.content, 900)}\``, [
      ['Quem', pessoa(msg.author), true], ['Canal', nomeCanal(msg.channel), true],
    ]));
  });
}

module.exports = { registrar };
