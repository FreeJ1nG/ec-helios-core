// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import dayjs from "dayjs";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const _andrew = {
  secretKey:
    6875160707115294089928404856982855399501967374313450825124411711277608097292n,
  publicKey: {
    x: 93511860258162638141011999956867032901232146735184332357793004911272556789229n,
    y: 25977141122028315417310117121445402422663001674017258907696947079392813884555n,
  },
};

const _penyu = {
  secretKey:
    46978390914595585661117372515527762560111867667730705342839159526684642795802n,
  publicKey: {
    x: 59508555324738974928730321050303513126687994192478985192235720110139867733250n,
    y: 113211108833453438331231115946973857775862748594833760413266362283631534541558n,
  },
};

const andrewKey = {
  owner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1 from hardhat
  publicKey: _andrew.publicKey,
  proof: {
    c: 2205983025151954609624374838826385137125583755568107128321639872616313727958n,
    d: 96132882629232528788423054073698498508703241511632104686757007313089666857400n,
  },
};

const penyuKey = {
  owner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2 from hardhat
  publicKey: _penyu.publicKey,
  proof: {
    c: 44507824449075019685418239025217718912472188658562651897814566605067164599470n,
    d: 83935123816820801615031768717279165148501198823044272406450059898056133776413n,
  },
};

export default buildModule("ElectionModule", (m) => {
  const election = m.contract("Election", [
    [andrewKey, penyuKey],
    ["Alice", "Bob", "Eve"],
    [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account #0 from hardhat
      andrewKey.owner,
      penyuKey.owner,
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account #3 from hardhat
      "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Account #4 from hardhat
      "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // Account #5 from hardhat
      "0x976EA74026E726554dB657fA54763abd0C3a0aa9", // Account #6 from hardhat
      "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // Account #7 from hardhat
      "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // Account #8 from hardhat
      "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // Account #9 from hardhat
      "0xBcd4042DE499D14e55001CcbB24a551F3b954096", // Account #10 from hardhat
      "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", // Account #11 from hardhat
    ],
    dayjs().add(10, "minutes").unix(),
  ]);

  return { election };
});
