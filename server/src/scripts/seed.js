require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const orgsData = require('../../../org_passwords.json');

async function main() {
  const orgs = orgsData.passwords;
  console.log(`Seeding ${orgs.length} organizations...`);

  const slugsInJson = new Set(orgs.map((o) => slugify(o.name)));

  for (const org of orgs) {
    const slug = slugify(org.name);
    const passwordHash = await bcrypt.hash(org.password, 12);

    await prisma.organization.upsert({
      where: { slug },
      update: { name: org.name, type: org.type, passwordHash },
      create: { name: org.name, type: org.type, slug, passwordHash },
    });
    console.log(`  ✓ ${org.name}`);
  }

  // Prune orgs that exist in the DB but no longer appear in org_passwords.json.
  // Cascade-deletes their documents.
  const dbOrgs = await prisma.organization.findMany({ select: { slug: true, name: true } });
  const orphaned = dbOrgs.filter((o) => !slugsInJson.has(o.slug));
  if (orphaned.length) {
    console.log(`\nRemoving ${orphaned.length} orgs no longer in source JSON:`);
    for (const o of orphaned) {
      await prisma.organization.delete({ where: { slug: o.slug } });
      console.log(`  ✗ ${o.name}`);
    }
  }

  console.log(`\nDone. ${orgs.length} organizations seeded${orphaned.length ? `, ${orphaned.length} pruned` : ''}.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
