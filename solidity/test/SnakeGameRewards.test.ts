import { assert, expect } from "chai";
import { ethers } from "hardhat";
import { keccak256 } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";
import cbor from "cbor";
// eslint-disable-next-line node/no-missing-import, camelcase
import { ByteParser__factory, CBORDecoding__factory, MerkleDB__factory, SnakeGameRewards__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Highscore Claiming", function () {
    // eslint-disable-next-line camelcase
    let MerkleDBFactory: MerkleDB__factory;
    // eslint-disable-next-line camelcase
    let CBORDecodingFactory: CBORDecoding__factory;
    // eslint-disable-next-line camelcase
    let SnakeGameRewards: SnakeGameRewards__factory;
    let ByteParserFactory: ByteParser__factory;
    
    let user: SignerWithAddress;
    let user2: SignerWithAddress;

    before(async () => {
        CBORDecodingFactory = await ethers.getContractFactory("CBORDecoding");
        MerkleDBFactory = await ethers.getContractFactory("MerkleDB");
        ByteParserFactory = await ethers.getContractFactory("ByteParser");
        SnakeGameRewards = await ethers.getContractFactory("SnakeGameRewards", {
            libraries: {
                CBORDecoding: (await CBORDecodingFactory.deploy()).address,
                ByteParser: (await ByteParserFactory.deploy()).address,
            },
        });
        [user, user2] = await ethers.getSigners();
    });

    it("Claim high scores", async function () {
        const userScores = [
            {
                name: user.address,
                score: 10,
            },
            {
                name: user2.address,
                score: 20,
            }
        ]

        // Generate leafs
        let leafs = [];
        for (const user of userScores) 
            leafs.push(cbor.encode(user));
        // Generate tree/root
        const tree = new MerkleTree(leafs, keccak256, {
            hashLeaves: true,
            sortPairs: true,
        });
        const root = tree.getRoot().toString("hex");

        // Test proof
        const merkleDB = await MerkleDBFactory.deploy();
        // Set root and IPFS hash (address(0) for now)
        merkleDB.updateMerkle("0x" + root, "0x"+"0".repeat(64))
        // Test a proof
        const proofLeaf0 = tree.getProof(keccak256(leafs[0]));
        const proofLeaf0Hex = proofLeaf0.map((e) => "0x" + e.data.toString("hex"));  
        assert(await merkleDB.merkleProofData(leafs[0], proofLeaf0Hex), 'leaf[0] proof invalid!')

        // Deploy Reward Contract
        const rewardContract = await SnakeGameRewards.deploy(merkleDB.address);
        // Attempt to claim reward
        await rewardContract.connect(user).claimHighScoreToken(leafs[0], proofLeaf0Hex);
        // Make sure we're the high score owner
        assert.equal(await rewardContract.HIGH_SCORE_HOLDER(), user.address, 'token not claimed');
        // Try stealing it from ourselves
        await expect(rewardContract.connect(user).claimHighScoreToken(leafs[0], proofLeaf0Hex))
                    .to.revertedWith("You don't have the high score!")

        // Grab it with user 2
        const proofLeaf1 = tree.getProof(keccak256(leafs[1]));
        const proofLeaf1Hex = proofLeaf1.map((e) => "0x" + e.data.toString("hex"));  
        await rewardContract.connect(user2).claimHighScoreToken(leafs[1], proofLeaf1Hex);
        // Make sure we're the high score owner
        assert.equal(await rewardContract.HIGH_SCORE_HOLDER(), user2.address, 'token not claimed'); 
    });

    it("Dummy scores (more nodes)", async function () {
        const profiles = [
            {
                name: user.address,
                score: 5,
            },
            {
                name: user2.address,
                score: 10,
            },
            {
                name: "0xbA824eea6fF5281554308aAc8A0E86B325B8a62e",
                score: 15,
            },
             {
                name: "0xbA824eea6fF5281554308a00000000000000000e",
                score: 20,
            },
        ];
    
        // Generate leafs
        let leafs = [];
        for (const user of profiles) 
            leafs.push(cbor.encode(user));
        // Generate tree/root
        const tree = new MerkleTree(leafs, keccak256, {
            hashLeaves: true,
            sortPairs: true,
        });
        const root = tree.getRoot().toString("hex");

        // Test proof
        const merkleDB = await MerkleDBFactory.deploy();
        // Set root and IPFS hash (address(0) for now)
        merkleDB.updateMerkle("0x" + root, "0x"+"0".repeat(64))
        // Test a proof
        const proofLeaf0 = tree.getProof(keccak256(leafs[0]));
        const proofLeaf0Hex = proofLeaf0.map((e) => "0x" + e.data.toString("hex"));  
        assert(await merkleDB.merkleProofData(leafs[0], proofLeaf0Hex), 'leaf[0] proof invalid!')

        // Deploy Reward Contract
        const rewardContract = await SnakeGameRewards.deploy(merkleDB.address);
        // Attempt to claim reward
        await rewardContract.connect(user).claimHighScoreToken(leafs[0], proofLeaf0Hex);
        // Make sure we're the high score owner
        assert.equal(await rewardContract.HIGH_SCORE_HOLDER(), user.address, 'token not claimed');
        // Try stealing it from ourselves
        await expect(rewardContract.connect(user).claimHighScoreToken(leafs[0], proofLeaf0Hex))
                    .to.revertedWith("You don't have the high score!")

        // Grab it with user 2
        const proofLeaf1 = tree.getProof(keccak256(leafs[1]));
        const proofLeaf1Hex = proofLeaf1.map((e) => "0x" + e.data.toString("hex"));  
        await rewardContract.connect(user2).claimHighScoreToken(leafs[1], proofLeaf1Hex);
        // Make sure we're the high score owner
        assert.equal(await rewardContract.HIGH_SCORE_HOLDER(), user2.address, 'token not claimed');   

        console.log(`Profiel: ${JSON.stringify(profiles)}`);
        console.log(`Merkle Root: ${root}`);
        console.log(`Unencoded Leaf Data: ${JSON.stringify(profiles[1])}`)
        console.log(`Leaf data: ${leafs[1].toString("hex")}`)
        console.log(`Proof Leaf (given to contract): ${proofLeaf1Hex}\n\n`)
        console.log(tree.toString());
    });
});
