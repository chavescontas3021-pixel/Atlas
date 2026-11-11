// Vigia os membros da blacklist e os que estão em observação: guarda tudo e avisa quando algo é suspeito.
const { AuditLogEvent, PermissionFlagsBits: P } = require('discord.js');
const B = require('../blacklist/nucleo');
const L = require('../logs/nucleo');

const PERIGOSAS = [
  P.Administrator, P.ManageGuild, P.ManageRoles, P.ManageChannels, P.BanMembers,
  P.KickMembers, P.ManageMessages, P.MentionEveryone, P.ModerateMembers,
];

const canalTxt = (c) => (c ? `<#${c.id}>` : 'canal desconhecido');
const trecho = (t) => L.corta(L.vazio(t), 900);
const listaTxt = (itens) => L.corta(itens.join(', '), 1000);

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const on = (evento, fn) =>
      client.on(evento, (...args) =>
        Promise.resolve().then(() => fn(...args)).catch((e) => console.error(`[Blacklist] ${evento}:`, e))
      );

    // ---------- Mensagens ----------
    on('messageCreate', async (msg) => {
      if (!msg.guild || !msg.author || msg.author.bot || msg.webhookId) return;
      if (!B.vigiado(msg.author.id)) return;

      const motivos = [...B.motivosConteudo(msg), ...B.motivosSpam(msg.author.id, msg.content)];
      const campos = [
        ['Canal', canalTxt(msg.channel), true],
        ['Ir até a mensagem', `[abrir](${msg.url})`, true],
        ['Mensagem', msg.content ? trecho(msg.content) : msg.attachments.size ? '[somente anexo]' : '[sem texto]'],
      ];

      if (motivos.length) {
        await B.alertar(msg.guild, msg.author.id, '🚨 Atividade suspeita', motivos.join('\n'), campos);
      } else {
        await B.alertar(msg.guild, msg.author.id, '💬 Mandou uma mensagem', `Em ${canalTxt(msg.channel)}`, campos, { suspeito: false });
      }
    });

    on('messageDelete', async (msg) => {
      if (!msg.guild || !msg.author || msg.author.bot) return;
      if (!B.vigiado(msg.author.id)) return;
      const motivos = B.motivosConteudo(msg);
      const suspeito = motivos.length > 0;
      await B.alertar(
        msg.guild,
        msg.author.id,
        suspeito ? '🚨 Mensagem suspeita foi apagada' : '🗑️ Mensagem dele foi apagada',
        `Em ${canalTxt(msg.channel)}${suspeito ? `\n${motivos.join('\n')}` : ''}`,
        [['Conteúdo', trecho(msg.content)]],
        { suspeito }
      );
    });

    on('messageUpdate', async (antes, depois) => {
      if (!depois.guild || !depois.author || depois.author.bot) return;
      if (!B.vigiado(depois.author.id)) return;
      if (antes.content === depois.content) return;

      const antigos = antes.partial ? [] : B.motivosConteudo(antes);
      const novos = B.motivosConteudo(depois).filter((x) => !antigos.includes(x));
      const suspeito = novos.length > 0;
      await B.alertar(
        depois.guild,
        depois.author.id,
        suspeito ? '🚨 Editou a mensagem para algo suspeito' : '✏️ Editou uma mensagem',
        `Em ${canalTxt(depois.channel)}${suspeito ? `\n${novos.join('\n')}` : ''}`,
        [
          ['Antes', antes.partial ? '(não estava no cache)' : trecho(antes.content)],
          ['Depois', trecho(depois.content)],
          ['Ir até a mensagem', `[abrir](${depois.url})`, true],
        ],
        { suspeito }
      );
    });

    // ---------- Entrada, saída e mudanças ----------
    on('guildMemberAdd', async (m) => {
      if (!B.vigiado(m.id)) return;
      await B.alertar(m.guild, m.id, '🚨 Membro vigiado entrou no servidor', 'Ele voltou (ou entrou pela primeira vez).', [
        ['Conta criada', L.quando(m.user.createdTimestamp), true],
      ]);
    });

    on('guildMemberRemove', async (m) => {
      if (!B.vigiado(m.id)) return;
      await B.alertar(m.guild, m.id, '📤 Saiu do servidor', 'O membro vigiado saiu.', [], { suspeito: false });
    });

    on('guildMemberUpdate', async (antes, depois) => {
      if (!B.vigiado(depois.id)) return;
      const g = depois.guild;

      if (antes.nickname !== depois.nickname) {
        await B.alertar(g, depois.id, '✏️ Mudou o apelido', '', [
          ['Antes', antes.nickname || '(nenhum)', true],
          ['Depois', depois.nickname || '(nenhum)', true],
        ], { suspeito: false });
      }

      if (antes.partial) return;
      const add = [...depois.roles.cache.values()].filter((r) => !antes.roles.cache.has(r.id));
      const rem = [...antes.roles.cache.values()].filter((r) => !depois.roles.cache.has(r.id));
      if (add.length || rem.length) {
        const perigoso = add.some((r) => PERIGOSAS.some((p) => r.permissions.has(p)));
        await B.alertar(
          g,
          depois.id,
          perigoso ? '🚨 Ganhou um cargo com permissões perigosas' : '🏷️ Cargos alterados',
          '',
          [
            add.length ? ['Adicionados', listaTxt(add.map((r) => `<@&${r.id}>`))] : null,
            rem.length ? ['Removidos', listaTxt(rem.map((r) => `<@&${r.id}>`))] : null,
          ].filter(Boolean),
          { suspeito: perigoso }
        );
      }
    });

    // ---------- Voz (entrar numa call sempre avisa a staff) ----------
    on('voiceStateUpdate', async (antes, depois) => {
      const m = depois.member || antes.member;
      if (!m || m.user.bot || !B.vigiado(m.id)) return;
      if (antes.channelId === depois.channelId) return;

      let texto;
      if (!antes.channelId) texto = `Entrou em <#${depois.channelId}>`;
      else if (!depois.channelId) texto = `Saiu de <#${antes.channelId}>`;
      else texto = `Foi de <#${antes.channelId}> para <#${depois.channelId}>`;
      const entrou = !!depois.channelId;
      await B.alertar(m.guild, m.id, '🔊 Atividade na voz', texto, [], { suspeito: false, forcar: entrou });
    });

    // ---------- Comandos e convites ----------
    on('interactionCreate', async (i) => {
      if (!i.guild || !i.isChatInputCommand() || !B.vigiado(i.user.id)) return;
      await B.alertar(i.guild, i.user.id, '⌨️ Usou um comando', `\`${L.corta(i.toString(), 200)}\``, [
        ['Canal', canalTxt(i.channel), true],
      ], { suspeito: false });
    });

    on('inviteCreate', async (invite) => {
      if (!invite.guild || !invite.inviter || !B.vigiado(invite.inviter.id)) return;
      await B.alertar(invite.guild, invite.inviter.id, '🚨 Criou um convite do servidor', `Código: \`${invite.code}\``, [
        ['Canal', canalTxt(invite.channel), true],
      ]);
    });

    // ---------- Ações dele no servidor (registro de auditoria) ----------
    on('guildAuditLogEntryCreate', async (entry, guild) => {
      const id = entry.executorId;
      if (!id || !B.vigiado(id)) return;
      const nome = Object.keys(AuditLogEvent).find((k) => AuditLogEvent[k] === entry.action) || `ação ${entry.action}`;
      await B.alertar(guild, id, '🚨 Fez uma ação de moderação/administração', `Registro de auditoria: **${nome}**`, [
        ['Alvo (ID)', entry.targetId ? `\`${entry.targetId}\`` : '—', true],
        ['Motivo', entry.reason || '—'],
      ]);
    });

    console.log('[Blacklist] vigiando os membros da lista e os em observação');
  },
};
