const fs = require('fs');
const path = require('path');

const CAMINHOS_TEXTO = [
  "config.prefixo",
  "config.recepcao.mensagens.boasVindas.titulo",
  "config.recepcao.mensagens.boasVindas.texto",
  "config.recepcao.mensagens.passos.titulo",
  "config.recepcao.mensagens.passos.texto",
  "config.recepcao.mensagens.sucesso.titulo",
  "config.recepcao.mensagens.sucesso.texto",
  "config.boasvindas.entrada.texto",
  "config.boasvindas.saida.texto",
  "config.noturno.mensagens.avisoFechar.texto",
  "config.noturno.mensagens.fechou.texto",
  "config.noturno.mensagens.avisoAbrir.texto",
  "config.noturno.mensagens.abriu.texto",
  "config.moderacao.mensagens.dmAviso.titulo",
  "config.moderacao.mensagens.dmAviso.texto",
  "config.moderacao.mensagens.dmBan.titulo",
  "config.moderacao.mensagens.dmBan.texto",
  "config.moderacao.mensagens.dmExpulsao.titulo",
  "config.moderacao.mensagens.dmExpulsao.texto",
  "config.livraria.mensagens.painelPublicacao.titulo",
  "config.livraria.mensagens.painelPublicacao.texto",
  "config.livraria.mensagens.painelFeedback.titulo",
  "config.livraria.mensagens.painelFeedback.texto",
  "config.ticket.mensagens.painel.titulo",
  "config.ticket.mensagens.painel.texto",
  "config.ticket.mensagens.abertura.titulo",
  "config.ticket.mensagens.abertura.texto",
  "config.aniversario.mensagens.anuncio.titulo",
  "config.aniversario.mensagens.anuncio.texto",
  "config.vagas.mensagens.painel.titulo",
  "config.vagas.mensagens.painel.texto",
  "config.inatividade.mensagens.painel.titulo",
  "config.inatividade.mensagens.painel.texto",
  "config.inatividade.mensagens.aviso.titulo",
  "config.inatividade.mensagens.aviso.texto",
  "config.inatividade.mensagens.liberada.titulo",
  "config.inatividade.mensagens.liberada.texto",
  "config.missoes.mensagens.conquista.titulo",
  "config.missoes.mensagens.conquista.texto",
  "config.chefe.mensagens.chamada.titulo",
  "config.chefe.mensagens.chamada.texto",
  "config.chefe.mensagens.vitoria.titulo",
  "config.chefe.mensagens.vitoria.texto",
  "config.chefe.mensagens.fuga.titulo",
  "config.chefe.mensagens.fuga.texto",
  "config.destaque.mensagem"
];

const CHAVES_OBSOLETAS = ['mensagens', 'conversa', 'modo', 'entrada', 'site', 'standby', 'config.mensagens', 'config.conversa', 'config.site', 'formsrv', 'personagem.desbloqueios'];
const CHAVES_DE_TEXTO = new Set(['mensagens', 'mensagem']);
const ESPECIES_REMOVIDAS = new Set(['dragonfox']);

const args = process.argv.slice(2);
const simular = args.includes('--simular');
const alvo = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(__dirname, '..', 'data', 'db.json'));

function apagar(raiz, caminho) {
  const partes = caminho.split('.');
  let atual = raiz;
  for (let i = 0; i < partes.length - 1; i++) {
    if (!atual || typeof atual !== 'object') return false;
    atual = atual[partes[i]];
  }
  const ultima = partes[partes.length - 1];
  if (!atual || typeof atual !== 'object' || !(ultima in atual)) return false;
  delete atual[ultima];
  return true;
}

function limparChavesDeTexto(no, removidos, trilha) {
  if (!no || typeof no !== 'object') return;
  for (const chave of Object.keys(no)) {
    if (CHAVES_DE_TEXTO.has(chave)) {
      delete no[chave];
      removidos.push(`${trilha}.${chave}`);
    } else {
      limparChavesDeTexto(no[chave], removidos, `${trilha}.${chave}`);
    }
  }
}

if (!fs.existsSync(alvo)) {
  console.error(`Não encontrei ${alvo}`);
  process.exit(1);
}

const dados = JSON.parse(fs.readFileSync(alvo, 'utf8'));
const removidos = [];

for (const c of CAMINHOS_TEXTO) if (apagar(dados, c)) removidos.push(c);
for (const c of CHAVES_OBSOLETAS) if (apagar(dados, c)) removidos.push(c);
if (dados.config) limparChavesDeTexto(dados.config, removidos, 'config');

const pets = dados.extras && dados.extras.pets;
if (pets) {
  for (const uid of Object.keys(pets)) {
    if (pets[uid] && ESPECIES_REMOVIDAS.has(pets[uid].especie)) {
      delete pets[uid];
      removidos.push(`extras.pets.${uid}`);
    }
  }
}

const aparencias = dados.personagem && dados.personagem.aparencia;
if (aparencias) {
  for (const uid of Object.keys(aparencias)) {
    if (aparencias[uid] && aparencias[uid].especial) {
      aparencias[uid].especial = '';
      removidos.push(`personagem.aparencia.${uid}.especial`);
    }
  }
}

console.log(`${removidos.length} item(ns) ${simular ? 'seriam removidos' : 'removidos'}.`);
for (const r of removidos.slice(0, 200)) console.log(` - ${r}`);

if (!simular && removidos.length) {
  const copia = `${alvo}.antes-do-reset-${Date.now()}`;
  fs.copyFileSync(alvo, copia);
  fs.writeFileSync(alvo, JSON.stringify(dados, null, 2));
  console.log(`Cópia de segurança: ${copia}`);
}
