// Textos e opções das funções novas da recepção:
// confirmação do personagem, "sou apenas representante" e avisos de assumir/devolver.
// Tudo pode ser editado no site (config.recepcao.mensagens.<tipo>).
const db = require('../db');

const PADROES = {
  mensagens: {
    confirmarPersonagem: {
      texto: 'Você quer usar **{personagem}** como o nome do seu personagem?',
    },
    dicaPersonagem: {
      texto:
        'Para escolher o personagem, me envie só o **nome** dele. ' +
        'Qualquer outra conversa pode ficar à vontade, eu não vou interferir. 💜',
    },
    dicaEmoji: {
      texto: 'Para escolher o emoji, use o menu acima ou me envie só um emoji (sem letras), tipo 🌸 ou ✦.',
    },
    repConfirmar: {
      titulo: '🤝 Sou apenas representante',
      texto:
        'Tem certeza, {usuario}?\n\n' +
        'Quem é **apenas representante** não fica com vaga e não passa pela recepção. ' +
        'Este canal será **apagado**.\n\n' +
        'Se você também quer uma vaga, aperte **Cancelar** e continue por aqui.',
    },
    rep: {
      titulo: '🤝 Canais de representante',
      texto:
        'Tudo certo, {usuario}! Estes são os seus canais:\n\n' +
        '🤝 **Parceria:** {canalParceria}\n' +
        '🛡️ **Aliança:** {canalAlianca}\n\n' +
        '*Este canal será apagado em {segundos} segundos.*',
    },
    assumiu: {
      texto: '🙋 {staff} assumiu o atendimento de {usuario}. O Atlas vai ficar em silêncio até a staff devolver.',
    },
    devolveu: {
      texto: '🤖 O Atlas voltou a cuidar do atendimento. {usuario}, pode continuar de onde parou!',
    },
    assumido: {
      texto: '🙋 A staff assumiu o seu atendimento. Aguarde, ela vai falar com você aqui no canal.',
    },
  },
};

const cfg = (chave, padrao) => db.get(`config.recepcao.${chave}`, padrao);

function mensagem(tipo) {
  return { titulo: '', ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) };
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

// Pedir confirmação antes de aceitar o nome do personagem (padrão: ligado)
const confirmarLigado = () => cfg('confirmarPersonagem', true) !== false;

// Canais mostrados para quem é apenas representante
const canais = () => ({ parceria: cfg('rep.canalParceria', null), alianca: cfg('rep.canalAlianca', null) });

// O botão "Sou apenas representante" só aparece se estiver ligado e tiver pelo menos um canal
const repDisponivel = () => {
  const c = canais();
  return cfg('rep.ativo', true) !== false && !!(c.parceria || c.alianca);
};

module.exports = { PADROES, mensagem, preencher, confirmarLigado, canais, repDisponivel };
