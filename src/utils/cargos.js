// Dá ou tira cargos de um membro, respeitando a hierarquia do servidor.
// acao: 'add' ou 'remover'. Retorna um texto com o resultado de cada cargo.
async function alterarCargos(executor, alvo, cargos, acao) {
  const guild = alvo.guild;
  const eu = guild.members.me ?? (await guild.members.fetchMe());
  const dono = guild.ownerId === executor.id;
  const razao = `Por ${executor.user.tag} via Atlas`;
  const linhas = [];

  for (const cargo of cargos) {
    if (cargo.id === guild.id) {
      linhas.push('❌ O @everyone não pode ser alterado.');
      continue;
    }
    if (cargo.managed) {
      linhas.push(`❌ ${cargo} é gerenciado por uma integração.`);
      continue;
    }
    if (cargo.position >= eu.roles.highest.position) {
      linhas.push(`❌ ${cargo} está acima (ou igual) ao cargo do Atlas. Arraste o cargo do Atlas para cima dele.`);
      continue;
    }
    if (!dono && cargo.position >= executor.roles.highest.position) {
      linhas.push(`❌ Você não pode mexer em ${cargo}, que está acima (ou igual) ao seu cargo mais alto.`);
      continue;
    }

    const tem = alvo.roles.cache.has(cargo.id);
    if (acao === 'add' && tem) {
      linhas.push(`ℹ️ ${alvo} já tem ${cargo}.`);
      continue;
    }
    if (acao === 'remover' && !tem) {
      linhas.push(`ℹ️ ${alvo} não tem ${cargo}.`);
      continue;
    }

    try {
      if (acao === 'add') await alvo.roles.add(cargo, razao);
      else await alvo.roles.remove(cargo, razao);
      linhas.push(acao === 'add' ? `✅ ${cargo} adicionado a ${alvo}.` : `✅ ${cargo} removido de ${alvo}.`);
    } catch (erro) {
      linhas.push(`❌ Não consegui mexer em ${cargo}. Confira as permissões do Atlas.`);
    }
  }

  return linhas.join('\n');
}

module.exports = { alterarCargos };
