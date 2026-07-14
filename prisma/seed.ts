import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const killers = [
  {
    name: "Trapper",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/8/80/IconCharacters_Trapper.png/revision/latest",
    wins: 5,
    losses: 3,
  },
  {
    name: "Wraith",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/b/b0/IconCharacters_Wraith.png/revision/latest",
    wins: 3,
    losses: 6,
  },
  {
    name: "Hillbilly (Billy)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/5/52/IconCharacters_HillBilly.png/revision/latest",
    wins: 2,
    losses: 1,
  },
  {
    name: "Nurse",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/b/bf/IconCharacters_Nurse.png/revision/latest",
    wins: 6,
    losses: 2,
  },
  {
    name: "Hag",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/e/e9/IconCharacters_Hag.png/revision/latest",
    wins: 0,
    losses: 0,
  },
  {
    name: "Doctor",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/9/9d/IconCharacters_Doctor.png/revision/latest",
    wins: 1,
    losses: 3,
  },
  {
    name: "Huntress",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/0/07/IconCharacters_Huntress.png/revision/latest",
    wins: 2,
    losses: 5,
  },
  {
    name: "Cannibal (Bubba Sawyer)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/2/2c/IconCharacters_Cannibal.png/revision/latest",
    wins: 0,
    losses: 3,
  },
  {
    name: "Nightmare (Freddy Krueger)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/1/19/IconCharacters_Nightmare.png/revision/latest",
    wins: 1,
    losses: 0,
  },
  {
    name: "Pig",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/7/71/IconCharacters_Pig.png/revision/latest",
    wins: 1,
    losses: 2,
  },
  {
    name: "Clown",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/3/3c/IconCharacters_Clown.png/revision/latest",
    wins: 4,
    losses: 2,
  },
  {
    name: "Spirit",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/b/be/IconCharacters_Spirit.png/revision/latest",
    wins: 2,
    losses: 3,
  },
  {
    name: "Legion",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/5/54/IconCharacters_Legion.png/revision/latest",
    wins: 0,
    losses: 0,
  },
  {
    name: "Plague",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/e/ea/IconCharacters_Plague.png/revision/latest",
    wins: 2,
    losses: 1,
  },
  {
    name: "Ghost Face",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/a/a2/IconCharacters_GhostFace.png/revision/latest",
    wins: 3,
    losses: 3,
  },
  {
    name: "Demogorgon",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/5/5d/IconCharacters_Demogorgon.png/revision/latest",
    wins: 1,
    losses: 2,
  },
  {
    name: "Oni",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/0/09/IconCharacters_Oni.png/revision/latest",
    wins: 0,
    losses: 0,
  },
  {
    name: "Deathslinger",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/f/f1/IconCharacters_Deathslinger.png/revision/latest",
    wins: 1,
    losses: 1,
  },
  {
    name: "Executioner (Pyramid Head)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/3/33/IconCharacters_Executioner.png/revision/latest",
    wins: 2,
    losses: 1,
  },
  {
    name: "Blight",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/5/5f/IconCharacters_Blight.png/revision/latest",
    wins: 1,
    losses: 2,
  },
  {
    name: "Twins",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/e/e8/IconCharacters_Twins.png/revision/latest",
    wins: 0,
    losses: 1,
  },
  {
    name: "Trickster",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/3/32/IconCharacters_Trickster.png/revision/latest",
    wins: 2,
    losses: 4,
  },
  {
    name: "Nemesis",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/3/35/IconCharacters_Nemesis.png/revision/latest",
    wins: 0,
    losses: 5,
  },
  {
    name: "Cenobite",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/e/e1/IconCharacters_Cenobite.png/revision/latest",
    wins: 0,
    losses: 0,
  },
  {
    name: "Artist",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/6/6c/IconCharacters_Artist.png/revision/latest",
    wins: 4,
    losses: 1,
  },
  {
    name: "Onryō (Sadako)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/0/04/IconCharacters_Onryo.png/revision/latest",
    wins: 2,
    losses: 0,
  },
  {
    name: "Dredge",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/c/c2/IconCharacters_Dredge.png/revision/latest",
    wins: 0,
    losses: 2,
  },
  {
    name: "Mastermind (Wesker)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/3/37/IconCharacters_Mastermind.png/revision/latest",
    wins: 2,
    losses: 2,
  },
  {
    name: "Knight",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/3/3d/IconCharacters_Knight.png/revision/latest",
    wins: 1,
    losses: 4,
  },
  {
    name: "Skull Merchant",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/6/6b/IconCharacters_SkullMerchant.png/revision/latest",
    wins: 0,
    losses: 0,
  },
  {
    name: "Singularity",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/8/88/IconCharacters_Singularity.png/revision/latest",
    wins: 0,
    losses: 1,
  },
  {
    name: "Xenomorph",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/e/e5/IconCharacters_Xenomorph.png/revision/latest",
    wins: 1,
    losses: 1,
  },
  {
    name: "Good Guy (Chucky)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/0/0b/IconCharacters_GoodGuy.png/revision/latest",
    wins: 1,
    losses: 1,
  },
  {
    name: "Unknown",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/e/ec/IconCharacters_Unknown.png/revision/latest",
    wins: 1,
    losses: 0,
  },
  {
    name: "Lich (D&D)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/5/5a/IconCharacters_Lich.png/revision/latest",
    wins: 1,
    losses: 3,
  },
  {
    name: "Dark Lord (Dracula)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/a/a8/IconCharacters_DarkLord.png/revision/latest",
    wins: 0,
    losses: 1,
  },
  {
    name: "Houndmaster",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/6/6e/IconCharacters_Houndmaster.png/revision/latest",
    wins: 1,
    losses: 0,
  },
  {
    name: "Shape (Michael Myers)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/f/f7/IconCharacters_Shape.png/revision/latest",
    wins: 4,
    losses: 1,
  },
  {
    name: "Ghoul (Kaneki)",
    imageUrl: "/images/killers/kaneki.webp",
    wins: 3,
    losses: 2,
  },
  {
    name: "Animatronic",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/d/d0/IconCharacters_Animatronic.png/revision/latest",
    wins: 9,
    losses: 3,
  },
  {
    name: "Krasue",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/a/a0/IconCharacters_Krasue.png/revision/latest",
    wins: 1,
    losses: 5,
  },
  {
    name: "First (Adriana)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/b/b5/IconCharacters_TheFirst.png/revision/latest",
    wins: 0,
    losses: 1,
  },
  {
    name: "Vecna (Stranger Things)",
    imageUrl:
      "https://static.wikia.nocookie.net/deadbydaylight/images/9/9e/IconCharacters_Vecna.png/revision/latest",
    wins: 5,
    losses: 3,
  },
  {
    name: "Jason",
    imageUrl: "/images/killers/jason.webp",
    wins: 0,
    losses: 0,
  },
];

const legacyRenames: Record<string, string> = {
  "Trapper (Caçador)": "Trapper",
  "Wraith (Espectro)": "Wraith",
  "Hag (Bruxa)": "Hag",
  "Huntress (Caçadora)": "Huntress",
  "Clown (Palhaço)": "Clown",
  "Plague (Praga)": "Plague",
  "Deathslinger (Mercenário)": "Deathslinger",
  "Twins (Gêmeos)": "Twins",
  "Trickster (Trapaça)": "Trickster",
  "Artist (Artista)": "Artist",
  "Dredge (Draga)": "Dredge",
  "Knight (Cavaleiro)": "Knight",
  "Singularity (Singularidade)": "Singularity",
  "Xenomorph (Xenomorfo)": "Xenomorph",
  "Unknown (Desconhecido)": "Unknown",
  "Houndmaster (Mestra Matilha)": "Houndmaster",
};

async function migrateLegacyNames() {
  for (const [oldName, newName] of Object.entries(legacyRenames)) {
    const legacy = await prisma.killer.findUnique({ where: { name: oldName } });
    if (!legacy) continue;
    const current = await prisma.killer.findUnique({ where: { name: newName } });
    if (current) continue;
    await prisma.killer.update({ where: { name: oldName }, data: { name: newName } });
    console.log(`↺ Renamed "${oldName}" → "${newName}"`);
  }
}

async function main() {
  console.log("🩸 Seeding DBD killers...");

  await migrateLegacyNames();

  for (const killer of killers) {
    await prisma.killer.upsert({
      where: { name: killer.name },
      update: { imageUrl: killer.imageUrl },
      create: { name: killer.name, imageUrl: killer.imageUrl },
    });
  }

  console.log(`✅ Seeded ${killers.length} killers.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
