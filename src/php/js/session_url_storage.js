/*
    Store urls in Session Storage and delete any tweets that are duplicate for urls

 */

function UrlStorage(){


    this.trackDuplicatedLinks = function()
    {
        var storage = window.sessionStorage;
        var urls = storage.length;
        var listedUrlsInPage = document.querySelectorAll("div.atweet div.urls > ul > li > a:first-child");
        for (var index = 0; index < listedUrlsInPage.length; index++) {
            var listedUrl = listedUrlsInPage[index].getAttribute("href");
            if (storage.getItem(listedUrl) == null) {
                console.log("Storing " + listedUrl);
                storage.setItem(listedUrl, "0");
            } else {
                // delete the tweet
                console.log("Found in store " + listedUrl);
                var parent = listedUrlsInPage[index];
                while (parent != null && parent.getAttribute("class") != "atweet") {
                    console.log(parent.tagName);
                    parent = parent.parentElement;
                }
                if (parent != null && parent.getAttribute("class") == "atweet") {
                    //could move this to a new section Duplicated Link?
                    // seen this before
                    console.log("deleting tweet with link to " + listedUrl);
                    deleteTweet(parent);
                }
            }
        }
    }

    function deleteTweet(tweet){
        tweet.style.backgroundColor = "515050;";
        tweet.style.opacity="20%";
        if(tweet.parentElement!=null) {
            //tweet.parentElement.removeChild(parent);
            console.log("or I would have if parent wasn't null");
        }
    }

    this.trackDuplicatedTweets = function()
    {
        var storage = window.sessionStorage;
        var urls = storage.length;
        var listedUrlsInPage = document.querySelectorAll("div.atweet");
        for (var index = 0; index < listedUrlsInPage.length; index++) {
            var tweetId = listedUrlsInPage[index].getAttribute("data-tweetid");
            if (storage.getItem(tweetId) == null) {
                console.log("Storing original " + tweetId);
                storage.setItem(tweetId, "0");
            }
            var retweetid = listedUrlsInPage[index].getAttribute("data-retweeting");
            if(retweetid!=null){
               if(storage.getItem(retweetid)==null){
                    console.log("Storing retweet " + retweetid);
                    storage.setItem(retweetid, "0");
                }else{
                    //seen ths before
                   console.log("deleting duplicate retweet" + retweetid);
                   deleteTweet(listedUrlsInPage[index]);
                }
            }
        }
    }
}