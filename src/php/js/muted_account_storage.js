
class MutedAccountsStorage {

    constructor(aKey) {
        this.key = aKey;
        this.twitterhandles = [];
        this.getLocalMutedAccounts();
    }

    setArrayContents(newArrayContents){
        this.twitterhandles = Array.from(newArrayContents);
    }

    storeMutedAccounts(){
        this.storeArrayLocally(this.key, this.twitterhandles)
    }

    getLocalMutedAccounts(){
        this.loadArrayFromLocal(this.key, this.twitterhandles)
    }

    storeArrayLocally(storageKey, theArray){
        if(localStorage){
            localStorage.setItem(storageKey, JSON.stringify(theArray));
        }
    }

    addToLocallyMutedTwitterHandles(aHandle){
        this.addToList(aHandle, this.twitterhandles);
        this.storeMutedAccounts();
    }

    addToList(valueToAdd, theArray){
        if(!theArray.includes(valueToAdd)){
            theArray.push(valueToAdd);
        }
        return valueToAdd;
    }

    loadArrayFromLocal(storageKey, theArray){
        if(localStorage && localStorage[storageKey]){
            var storageArray = JSON.parse(localStorage.getItem(storageKey));
            theArray.push.apply(theArray, storageArray);
        }
    }

    isMutedHandle(aHandle){
        return this.twitterhandles.includes(aHandle);
    }

    removeMutedHandle(aHandle){
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
        this.twitterhandles = this.twitterhandles.filter(handle => handle !== aHandle);
        this.storeMutedAccounts()
    }

    getMutedHandles(){
        return this.twitterhandles;
    }
}

class MutedAccountsGUI {

    constructor(mutedAccountsStorage, mutedIdsStorage) {
        this.storage = mutedAccountsStorage;
        this.idsstorage = mutedIdsStorage;
    }

    deleteTweetsFromMutedAccounts(){
        var mutedAccounts = this.storage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedHandle, divs;
        for (i=0; i<numberOfMuted; i++) {
            mutedHandle = mutedAccounts[i];
            this.deleteTweetsFromHandle(mutedHandle);
        }
    }

    deleteTweetsFromMutedAccountIds(){
        var mutedAccounts = this.idsstorage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedId, divs;
        for (i=0; i<numberOfMuted; i++) {
            mutedId = mutedAccounts[i];
            this.deleteTweetsFromId(mutedId);
        }
    }

    deleteTweetsFromHandle(aHandle){
        var divs = document.querySelectorAll("div.atweet[data-from-userhandle='"+aHandle+"']");
        var insertHere = document.querySelector("#muted-account-tweets");
        for (var divindex=0; divindex<divs.length; divindex++) {
            // delete
            //divs[divindex].parentNode.removeChild(divs[divindex]);
            // move
            insertHere.appendChild(divs[divindex]);
            // unmute
        }
        this.changeMuteButtonTextForHandle(aHandle, "Unmute (local)");

    }

    changeMuteButtonTextForHandle(aHandle, buttonText){
        //make button unmute if in local list
        var buttons = document.querySelectorAll("button.localmute[data-twitterhandle='" + aHandle + "']");
        for (var buttonindex=0; buttonindex<buttons.length; buttonindex++) {
            buttons[buttonindex].innerHTML=buttonText;
        }
    }

    deleteTweetsFromId(anId){
        var divs = document.querySelectorAll("div.atweet[data-from-userid='"+anId+"']");
        var insertHere = document.querySelector("#muted-account-tweets");
        for (var divindex=0; divindex<divs.length; divindex++) {
            // delete
            //divs[divindex].parentNode.removeChild(divs[divindex]);
            // move
            insertHere.appendChild(divs[divindex]);
        }
    }

    restoreMutedTweets(anId, aHandle){
        var allMutedUserIdTweets = "div#muted-account-tweets > div.atweet[data-from-userid='"+anId+"']";
        var allMutedUserHandleTweets = "div#muted-account-tweets > div.atweet[data-from-userhandle='"+aHandle+"']";
        var divs = document.querySelectorAll(allMutedUserIdTweets+","+allMutedUserHandleTweets);
        var insertHere = document.querySelector("div.tweets-section");
        for (var divindex=0; divindex<divs.length; divindex++) {
            insertHere.appendChild(divs[divindex]);
        }
        // change buttons back to "mute (local)"
        this.changeMuteButtonTextForHandle(aHandle, "Mute (local)");
    }

    addMutedPluginSection(){
        var hasButtonAlready = document.querySelector("div#header-plugins-section button.servermutedrefresh");
        if(hasButtonAlready){
            // ignore
        }else {

            var html = `<details><summary>Muted Accounts</summary>
                            <button class='servermutedrefresh'>Get Muted Account Ids From Server</button>
                            <a href="https://twitter.com/settings/muted/all" target="_blank">Twitter: Manage Muted Accounts</a>
                            <details id="local-muted-accounts-list-section">
                                <summary>Local Storage Muted Accounts</summary>
                                <ul id="local-muted-accounts-list"></ul>
                            </details>
                            <details id="server-muted-accounts-list-section">
                                <summary>Server Muted Account Ids</summary>
                                <ul id="server-muted-accounts-list"></ul>
                            </details>
                        </details>
                        `;

            var footerhtml = `<details><summary>Muted Account Tweets</summary>
                            <a href="https://twitter.com/settings/muted/all" target="_blank">Twitter: Manage Muted Accounts</a>
                            <div id="muted-account-tweets"></div>
                        </details>
                        `;

            var header = document.querySelector("div#header-plugins-section").
            insertAdjacentHTML("afterbegin", html);

            var footer = document.querySelector("div#footer-plugins-section").
            insertAdjacentHTML("afterbegin", footerhtml);

            var button = document.querySelector("div#header-plugins-section button.servermutedrefresh");
            button.addEventListener("click", function () {
                mutedAccountsGUI.getMutedIdsFromServer();
                mutedAccountsGUI.refreshServerMutedAccountsList();
                mutedAccountsGUI.deleteTweetsFromMutedAccountIds();
            });

            this.refreshLocalMutedAccountsList();
            this.refreshServerMutedAccountsList();
        }
    }

    refreshLocalMutedAccountsList(){
        var mutedAccounts = this.idsstorage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedHandle, divs;
        var ul = document.querySelector("#server-muted-accounts-list");

        var child = ul.lastElementChild;
        while (child) {
            ul.removeChild(child);
            child = ul.lastElementChild;
        }

        for (i=0; i<numberOfMuted; i++) {
            var mutedAccount= mutedAccounts[i];
            //var html = `<li><a href="https://twitter.com/i/user/50988711">`
            var html = `<li><a href="https://twitter.com/i/user/${mutedAccount}" target="_blank">${mutedAccount}</a></li>`;
            ul.insertAdjacentHTML("afterbegin", html);
        }
    }

    refreshServerMutedAccountsList(){
        var mutedAccounts = this.storage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedHandle, divs;
        var ul = document.querySelector("#local-muted-accounts-list");

        var child = ul.lastElementChild;
        while (child) {
            ul.removeChild(child);
            child = ul.lastElementChild;
        }

        for (i=0; i<numberOfMuted; i++) {
            var mutedAccount= mutedAccounts[i];
            //var html = `<li><a href="https://twitter.com/i/user/50988711">`
            var html = `<li><a href="https://twitter.com/${mutedAccount}" target="_blank">${mutedAccount}</a></li>`;
            ul.insertAdjacentHTML("afterbegin", html);
        }
    }


    replaceMuteButtonWithLink(muteId){

    }

    addMuteButtonsToTweets(){
        var divs = document.querySelectorAll("div.atweet");
        for (var divindex=0; divindex<divs.length; divindex++) {
            var hasButtonAlready = divs[divindex].querySelector("div.tweet-plugins-section button.localmute");
            if(hasButtonAlready){
                // ignore
            }else{

                var div = divs[divindex];
                var muteHandle = div.getAttribute("data-from-userhandle");
                var muteId = div.getAttribute("data-from-userid");

                // if muteId is in the server list then do not add a button
                var useButton=true;
                var html = `<a href="https://twitter.com/i/user/${muteId}" target="_blank">Manage Muting On Twitter</a>`;



                if(mutedAccountIdsStorage.isMutedHandle(muteId)){
                    useButton=false;
                }else{
                    // add button as well for local muting
                    html = `<button class='localmute' data-twitterhandle='${muteHandle}' data-twitteruserid='${muteId}'>Mute (local)</button> `+html;
                }

                //add the html
                var header = divs[divindex].querySelector("div.tweet-plugins-section");
                header.insertAdjacentHTML("afterbegin", html);
                var button = header.firstChild;

                if(useButton) {
                    button.addEventListener("click", function () {
                        var muteThisHandle = this.getAttribute("data-twitterhandle");
                        var muteThisId = this.getAttribute("data-twitteruserid");
                        // if handle exists then we are unmuting it
                        if (mutedAccountsStorage.isMutedHandle(muteThisHandle)) {
                            mutedAccountsStorage.removeMutedHandle(muteThisHandle);
                            // move tweets back into main view if not server muted
                            if(!mutedAccountIdsStorage.isMutedHandle(muteThisId)) {
                                mutedAccountsGUI.restoreMutedTweets(muteThisId, muteThisHandle)
                            }
                        } else {
                            mutedAccountsGUI.deleteTweetsFromHandle(muteThisHandle);
                            mutedAccountsStorage.addToLocallyMutedTwitterHandles(muteThisHandle);
                            mutedAccountsGUI.refreshLocalMutedAccountsList();
                        }
                    });
                }
            }
        }
    }

    getMutedIdsFromServer(){
        const Http = new XMLHttpRequest();
        // const url='twitterapi.php?apicall=mutedids'; as int
        const url='twitterapi.php?apicall=mutedidsstringify';
        Http.open("GET", url);
        Http.send();

        Http.onload = (e) => {
            //console.log(Http.responseText);
            // ISSUE: JSON.parse will change big ids to wrong numbers
            // https://stackoverflow.com/questions/18755125/node-js-is-there-any-proper-way-to-parse-json-with-large-numbers-long-bigint
            var ids = JSON.parse(Http.responseText);
            //console.log(ids);
            //var arrayContents = /{"ids":\[(.*)\]}/.exec(Http.responseText);
            //var ids=arrayContents[1].split(",");

            mutedAccountIdsStorage.setArrayContents(ids.ids);
            mutedAccountIdsStorage.storeMutedAccounts();
            mutedAccountsGUI.deleteTweetsFromMutedAccountIds();
        }
    }

}