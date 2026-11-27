async function donoId(client) {
  try {
    const app = await client.application.fetch();
    const o = app.owner;
    return o && o.members ? (o.members.find((m) => m.role === 'admin') || o.members.first() || {}).id : o && o.id;
  } catch { return null; }
}

const ehDono = async (client, uid) => {
  const d = await donoId(client);
  return Boolean(d) && String(d) === String(uid);
};

module.exports = { donoId, ehDono };
