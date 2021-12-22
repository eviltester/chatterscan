

// currently requires const allTweetData = ${jsonOutputForTesting}; generated in page

window.addEventListener('load', (event) => {

    // add next page button at top as well
    const givenNextPageButton = document.querySelector('div.nextpage');
    const newNextPageButton = givenNextPageButton.cloneNode(true);
    const nextPageButtonParent = document.querySelector('#next-button-placemarker');
    nextPageButtonParent.appendChild(newNextPageButton);


    addFiltersMenuToElement(document.getElementById('filterscontrol'));
    document.getElementById("applyFiltersButton").addEventListener("click", applyFiltersFromFiltersMenu)


    addEditSearchTermButton();
    renderCollectionOfTweetsInDOM(allTweetData);


    // todo: duplicates is not just based on href it is based on the filters, and is after rendering tweets
    if(!appliedFilters.showSeenTweets){ // location.href.includes("hideSeenTweets=true")) {
        var urlStorage = new UrlStorage();
        urlStorage.trackDuplicatedLinks();
        urlStorage.trackDuplicatedTweets();
    }

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