const SplitWallet = artifacts.require("SplitWallet");
const Governance = artifacts.require("Governance");
const BasicSplitAgent = artifacts.require("BasicSplitAgent");
const NFT = artifacts.require("NFT");

contract("split test", accounts => {
  before(async function () {

    [owner, account1] = await web3.eth.getAccounts();

    governance = await Governance.new();
    splitWalletTemplate = await SplitWallet.new();
    basicSplitAgent = await BasicSplitAgent.new(governance.address);

    nft = await NFT.new();

    await governance.setWalletTemplate(splitWalletTemplate.address);
    await governance.setAgentEnabled(basicSplitAgent.address, true);

    const { receipt } = await governance.createWallet();
    wallet = await SplitWallet.at(receipt.logs.find(({ event}) => event == 'CreatedWallet').args.newWallet);
			
    await wallet.init("TESTTocken","TT", owner, governance.address);
  });

  it("agent for NFT", async function() {
    // add item to ERC721 
    await nft.awardItem(owner,"test item");
    // transfer the NTF to splitwallet
    tokenId = await nft.tokenOfOwnerByIndex(owner, 0);
    await nft.transferFrom(owner, wallet.address, tokenId);

    // check the owner of the NFT
    assert.equal(await nft.ownerOf(tokenId), wallet.address);

  });

  
  it("split wallet", async function() {
     await basicSplitAgent.start(wallet.address,[owner, account1],[100, 200]);

     assert.equal(await wallet.balanceOf(owner), 100);
     assert.equal(await wallet.balanceOf(account1), 200);
     
    // check the owner of wallet
    assert.equal(await wallet.owner(), 0);
 
  });

  it("transfer with token", async function() { 
    await wallet.transfer(owner, 10, { from: account1 });
      
    assert.equal(await wallet.balanceOf(owner), 110);
    assert.equal(await wallet.balanceOf(account1), 190);
  });

  
  it("retrieve wallet", async function() {
    // transfer all token to owner 
    await wallet.transfer(owner, 190, { from: account1 });
    
    assert.equal(await wallet.balanceOf(owner), 300);
    assert.equal(await wallet.balanceOf(account1), 0);

    await wallet.retrieve(owner,{ from: owner });

    // check the owner of wallet
    assert.equal(await wallet.owner(), owner);
  });

  it("take back NFT", async function() { 
    await wallet.functionCallWithValue(
      nft.address,'0',
      nft.contract.methods.safeTransferFrom(wallet.address, owner, 1).encodeABI(),
      { from: owner }
    );

    assert.equal(await nft.ownerOf(tokenId), owner);
  });

});