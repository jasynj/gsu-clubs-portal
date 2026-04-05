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

  console.log(`\nDone. ${orgs.length} organizations seeded.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
