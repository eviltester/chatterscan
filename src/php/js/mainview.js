function searchForHighlightedText(allowEdit=false){
    var selectedText = "";
    try{
        selectedText = document.getSelection().anchorNode.data.substr(document.getSelection().anchorOffset, document.getSelection().focusOffset-document.getSelection().anchorOffset);
    }catch(err){
        // ignore
    }
    if(selectedText.trim().length>0){
        searchForTerm(allowEdit, selectedText);
    }else{
        alert("Select some text in the tweet and then you can click the 'go sel' button to search for it. 'edit sel' will let you edit the selection prior to searching for it.");
    }
}

function searchForTerm(allowEdit=false,chosenTerm=""){
    var selectedText = chosenTerm;
    if(allowEdit){
        newSelectedText = prompt("Search Term", selectedText);
        if(newSelectedText===null || newSelectedText.valueOf() == selectedText.valueOf()){
            return;
        }
        selectedText=newSelectedText;
    }
    var searchTerm = encodeURIComponent(selectedText);
    window.open(window.location.href.split("?")[0]+"?searchterm="+searchTerm);
}



window.addEventListener('load', (event) => {

    // add next page button at top as well
    const givenNextPageButton = document.querySelector('div.nextpage');
    const newNextPageButton = givenNextPageButton.cloneNode(true);
    const nextPageButtonParent = document.querySelector('#next-button-placemarker');
    nextPageButtonParent.appendChild(newNextPageButton);



    if(location.href.includes("hideSeenTweets=true")) {
        var urlStorage = new UrlStorage();
        urlStorage.trackDuplicatedLinks();
        urlStorage.trackDuplicatedTweets();
    }

    addFiltersMenuToElement(document.getElementById('filterscontrol'));
    document.getElementById("applyFiltersButton").addEventListener("click", applyFiltersFromFiltersMenu)


    var localMutedAccountsKey = `chatterscan.localmutedaccounts.${twitterUserHandle}`;
    var mutedAccountsStorage = new MutedAccountsStorage(localMutedAccountsKey);
    var serverMutedAccountsKey = `chatterscan.serverMutedAccountIds.${twitterUserHandle}`;
    var mutedAccountIdsStorage = new MutedAccountsStorage(serverMutedAccountsKey);
// todo this should be a manual refresh action in the plugins
//echo "mutedAccountsGUI.getMutedIdsFromServer();";
    var mutedAccountsGUI = new MutedAccountsGUI(mutedAccountsStorage, mutedAccountIdsStorage);
    mutedAccountsGUI.addMutedPluginSection();
    mutedAccountsGUI.deleteTweetsFromMutedAccounts();
    mutedAccountsGUI.deleteTweetsFromMutedAccountIds();
    mutedAccountsGUI.addMuteButtonsToTweets();

});