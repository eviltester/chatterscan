class TweetRenderer{

    currentUserHandle="";
    pageNamePHP="mainview.php";
    tweet="";

    tweet_link_url="";

    forUserHandle(aHandle){
        this.currentUserHandle = aHandle;
    }

    mainPage(phpFileName){
        this.pageNamePHP = phpFileName;
    }

    tweetToRender(aTweet){
        this.tweet = aTweet;
        // could cache commonly used HTML or values here
        this.tweet_link_url = this.getTweetLinkURL();
    }

    getHashTagLinkHTML(hashTag){

        const encodedHashTagTerm = encodeURI(hashTag);
        const pageHref = this.pageNamePHP;

        return `
        <a href='${pageHref}?hashtag=${encodedHashTagTerm}' target='_blank'>
            <button>${hashTag}</button>
        </a>
        `

    }

    getHashTagsHTML(){
        const hashtagsArray = this.tweet.hashtags;
        let hashTagHtml = "";

        hashtagsArray.forEach( hashTagTerm => {
            hashTagHtml = hashTagHtml + this.getHashTagLinkHTML(hashTagTerm) + " ";
        })

        return `
        <div class='hashtags'>${hashTagHtml}</div>
        `;
    }

    // occasionally see "this site can't provide secure connection" from twitter with shortened urls
    // thought about adding an expander here
    // unshorten.me has an api https://unshorten.me/api
    // unshorten link has a GET request format https://unshorten.link/check?url=http://goo.gl/B2ZDUr
    // link unshorten has a GET request format https://linkunshorten.com/?url=https%3A%2F%2Fgoo.gl%2FtFM2Ya
    getUrlsHTML(){

        const urlsArray=this.tweet.urls;
        let urlsInnerHTML="";

        const numberOfUrls = urlsArray.length;

        if (numberOfUrls <= 0) {
            return "";
        }

        urlsArray.forEach(aURL => {
            const urlHref = aURL.urlHref;
            const encodedUrlHref = encodeURI(urlHref);
            const urlDisplay = aURL.urlDisplay;

            const urlsli = `
            <li>
                <a href='${urlHref}' target='_blank'>${urlDisplay}</a> expanded:
                <a href='https://unshorten.link/check?url=${encodedUrlHref}'
                   target='_blank'>[unshorten.link]</a>
                <a href='https://linkunshorten.com/?url=$encodedUrlHref'
                   target='_blank'>[linkunshorten.com]</a>
            </li>
            `;
            urlsInnerHTML = urlsInnerHTML + urlsli;
        });

        return `
            <details>
                <summary>urls</summary>
                <div class='urls'>
                    <ul>
                        ${urlsInnerHTML}
                    </ul>
                </div>
            </details>
        `;

    }

    getTweetLinkURL(){
        const screenName = this.tweet.screenName;
        const tweetId = this.tweet.id;

        return `https://twitter.com/${screenName}/status/${tweetId}`;
    }

    getTweetImageHtml(){
        if(this.tweet.firstImageLink.length > 0){
            const link = this.tweet.firstImageLink;
            return `<img src='${link}' width=150/>"`;
        }else{
            return "";
        }
    }

    getMainTweetLinkHTML(){
        const link = this.tweet_link_url;
        return `<h3 style='text-align: center'><a href='${link}' target='_blank'>view tweet</a></h3>`;
    }

    convertTwitterHandlesIntoLinks(tweetText){

        // twitter handle @[a-zA-Z0-9_]
        let regEx = /@[a-zA-Z0-9_]*/g;

        function convertToScreenNameLink(match, offset, string){
            return this.getScreenNameLink(match.substring(1), match);
        }

        return tweetText.replace(regEx, convertToScreenNameLink.bind(this))
    }

   getTweetContentsHTML(){

        const imageHtml = this.getTweetImageHtml();
        var tweetWithLinks = this.convertTwitterHandlesIntoLinks(this.tweet.full_text);
        const fullText = this.tweet.full_text;
        // for each of the urls replace the urls in the text with a clickable link
       this.tweet.urls.forEach(aUrl =>{
           //urlInPost urlDisplay urlHref
           const findUrl = aUrl.urlInPost;
           const linkUrl = aUrl.urlHref;
           const displayUrl = aUrl.urlDisplay;
           const replaceWith = `<a href='${linkUrl}' target='_blank'>${displayUrl}</a>`;
           tweetWithLinks = tweetWithLinks.replace(findUrl, replaceWith);
       })

        const hrefUrl = this.tweet_link_url;
        let postClass = "textbit";
        if(imageHtml.length>0){
            postClass = "textwithimagebit";
        }

        return `
        <div class='tweetcontents'>
            <div class='${postClass}'>
                <h2 class='tweet-text'>${tweetWithLinks}</h2>
                <!-- ${fullText} -->
            </div>
            <div class='imagebit'>
                <a href='${hrefUrl}' target='_blank'>
                    ${imageHtml}
                </a>
            </div>
        </div>
        `;


    }

    getTweetLinksSectionHTML(){
        const mainTweetLinkHTML = this.getMainTweetLinkHTML();
        let hashTagHTML = "";
        let urlHTML = "";

        if(this.tweet.hashtags.length>0) {
            hashTagHTML = this.getHashTagsHTML();
        }

        if(this.tweet.urls.length>0) {
            urlHTML = this.getUrlsHTML();
        }

        return `<div class="tweetlinks">
                    ${mainTweetLinkHTML}
                    ${hashTagHTML}
                    ${urlHTML}
            </div>
        `;

    }

    getScreenNameLink(screenName, linkText){
        const pageName = this.pageNamePHP;
        return `<a href='${pageName}?screen_name=${screenName}' target='_blank'>${linkText}</a>`;
    }

    getTweetHeaderHTML(){

        const screenName = this.tweet.screenName;
        const currentUserHandle = this.currentUserHandle;
        const profile_image = this.tweet.profile_image;
        const tweetCreatedAt = this.tweet.created_at;
        const userDisplayName = this.tweet.tweetUserDisplayName;
        const tweetUrl = this.tweet_link_url;

        const searchSelectedHTML = "<button onclick='searchForHighlightedText()'>selected text</button>";
        const searchEditSelectedHTML = "<button onclick='searchForHighlightedText(true)'>edited selected</button>";
        const searchSelectedHTMLAsTerm = "<button onclick='searchForHighlightedTextUsingSavedSearchGui(false)'>selected as adhoc </button>";
        const searchSelectedHTMLAsEditedTerm = "<button onclick='searchForHighlightedTextUsingSavedSearchGui(true)'>edited as adhoc</button>";

        const viewScreenNameFeed = this.getScreenNameLink(screenName, "view feed");
        const compareViaSocialBlade =
            `<a href='https://socialblade.com/twitter/compare/${currentUserHandle}/${screenName}'
                    target='_blank'>compare stats
              </a>`;

        function getClipBoardUrlLinkTo(tweetUrl,linkTo, displayText){
            return `<a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('${linkTo}')})">${displayText}</a>
        `;
        }

        const zlappo = getClipBoardUrlLinkTo(tweetUrl, "https://zlappo.com/app/queue/", "with zlappo");


        const tweetpoet = getClipBoardUrlLinkTo(tweetUrl, "https://poet.so", "poet.so");
        const tweetpik = getClipBoardUrlLinkTo(tweetUrl, "https://tweetpik.com/#app", "tweetpik");
        const twipix = getClipBoardUrlLinkTo(tweetUrl, "https://twipix.co/dash", "twipix");
        const tweetimage = getClipBoardUrlLinkTo(tweetUrl, "https://tweet-image.glitch.me", "tweet-image");
        const twimage = getClipBoardUrlLinkTo(tweetUrl, "https://twimage.vercel.app", "twimage");
        const t10015_io = getClipBoardUrlLinkTo(tweetUrl, "https://10015.io/tools/tweet-to-image-converter", "10015.io");
        const tweetlet = getClipBoardUrlLinkTo(tweetUrl, "https://tweetlet.net/", "tweetlet");

        // todo: add search selected as term

        const dropdown =`
        <div class="dropdown"><p class="droptopmenu">=====</p><div class="dropdown-content">
            ${viewScreenNameFeed}
            ${compareViaSocialBlade}
            <div class="menu-separator">__ Search __</div>
            ${searchSelectedHTML}
            ${searchEditSelectedHTML}
            ${searchSelectedHTMLAsTerm}
            ${searchSelectedHTMLAsEditedTerm}
            <div class="menu-separator">__ As Image __</div>
            ${tweetpoet}
            ${tweetimage}
            ${twipix}
            ${twimage}
            ${tweetpik}         
            ${tweetlet}
            ${t10015_io}
            <div class="menu-separator">__ Schedule __</div>
            ${zlappo}

        </div></div>
        `;

        return `
            <div class='tweetheader'>
                <a href='https://twitter.com/${screenName}' target='_blank'><img src='${profile_image}' width='48px'/></a>
                 &nbsp; 
                 <strong><a href='https://twitter.com/${screenName}' target='_blank'> ${screenName}</a> ${userDisplayName}</strong>
                 (<a href='${tweetUrl}' target='_blank'>${tweetCreatedAt}</a>)
                ${dropdown}
            </div>
        `;

    }

    getPHPBasedTweetPluginOutput(){
        const tweetId = this.tweet.id;

        if(this.tweet.tweetIsPossibleThread){
            return `
                <p>View Thread via [
                    <a href='https://threadreaderapp.com/thread/${tweetId}.html' target='_blank'>
                    ThreadReader
                    </a>
                    ]
                </p>`;
        }
        return "";
    }

    getTweetAsHTML(){
        let html = "<div class='atweet' data-from-userid='"+this.tweet.tweetUserID+"' data-from-userhandle='"+this.tweet.screenName+"'";

        html = html+" data-tweetid='"+this.tweet.id+"' ";

        if(this.tweet.retweetingid.length>0){
            html = html+" data-retweeting='"+this.tweet.retweetingid+"' ";
        }

        html = html+">";


        html = html+this.getTweetInnerHTML();
        html = html+"</div>";
        return html;
    }

    getTweetInnerHTML(){

        let html = this.getTweetHeaderHTML();

        html = html + this.getTweetContentsHTML();
        html = html + this.getTweetLinksSectionHTML();
        html = html + this.getPHPBasedTweetPluginOutput();
        html = html + "<details><summary class='small'>Plugins: muting</summary><div class='tweet-plugins-section'>"+
            "</div></details>";

        html = html+'<hr/>';

        return html;

    }

    getTweetAsElem(){
        const elem = document.createElement('div');
        elem.classList.add("atweet");
        elem.setAttribute("data-from-userid", this.tweet.tweetUserID);
        elem.setAttribute("data-from-userhandle", this.tweet.screenName);
        elem.setAttribute("data-tweetid", this.tweet.id);

        if(this.tweet.retweetingid.length>0){
            elem.setAttribute("data-retweeting",this.tweet.retweetingid);
        }

        elem.innerHTML = this.getTweetInnerHTML();

        return elem;
    }

}




/*
    Add a collection of hidden tweets to the DOM
 */
function showHiddenTweets(title, tweets, container, tweetRenderer){

    if (tweets.length===0){
        return;
    }

    // add hidden tweets title if it does not exist
    const hiddenTitle = document.querySelector('#hiddentweetstitle');

    if(hiddenTitle===null){
        const linktitle = document.createElement("p");
        linktitle.setAttribute("id","hiddentweetstitle");
        linktitle.innerText="View Any Available Hidden Tweets";
        container.appendChild(linktitle);
    }


    // add the details summary and tweeets
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.innerText= title + " " + tweets.length;
    details.appendChild(summary);

    tweets.forEach(tweet => {
        tweetRenderer.tweetToRender(tweet);
        details.appendChild(tweetRenderer.getTweetAsElem());
    })

    // add link to hidden tweets title
    const linkbacktotitlepara = document.createElement("p");
    linkbacktotitlepara.classList.add("centertext")
    const linkbacktotitlea = document.createElement("a");
    linkbacktotitlea.setAttribute("href","#hiddentweetstitle");
    linkbacktotitlea.innerText="Hidden Tweets Contents";
    linkbacktotitlepara.appendChild(linkbacktotitlea);
    details.appendChild(linkbacktotitlepara)


    // addNextPageButton
    // const givenNextPageButton = document.querySelector('div.nextpage');
    // if(givenNextPageButton!=null){
    //     const newNextPageButton = givenNextPageButton.cloneNode(true);
    //     details.appendChild(newNextPageButton);
    // }

    container.appendChild(details);
}

/*
    Populate the DOM with all shown tweets and all hidden tweets in details sections
 */
function renderCollectionOfTweetsInDOM(allTweetData){
    const container = document.querySelector(".tweets-section");
    const after = document.getElementById("show-tweets-start-here");

    const tweetRenderer = new TweetRenderer();
    tweetRenderer.forUserHandle(twitterUserHandle);
    tweetRenderer.mainPage("mainview.php");

    const hashtagCountStorage = new HashtagCountStorage();
    hashtagCountStorage.forUser(twitterUserHandle);
    // get any saved counts
    hashtagsCloud = hashtagCountStorage.loadHashTags();

    let shown_count=0;
    allTweetData.forEach( aTweet =>{

        tweetRenderer.tweetToRender(aTweet);

        if(!aTweet.renderDecision.ignore){
            container.appendChild(tweetRenderer.getTweetAsElem());
            shown_count++;
        }

        // todo: this could be pushed off to a web worker if it takes too long
        if(hashtagsCloud){
            aTweet.hashtags.forEach( hashtag =>{
                const hashTagLc = hashtag.toLowerCase();
                if(hashtagsCloud[hashTagLc]===undefined){
                    hashtagsCloud[hashTagLc] = 1;
                }else{
                    hashtagsCloud[hashTagLc] = hashtagsCloud[hashTagLc]+1;
                }
            })
        }
    })

    const hiddenContainer = document.querySelector(".hidden-tweets-section");

    document.querySelectorAll(".shown-count").forEach(node => {node.innerText=shown_count});

    const threadedTweets = allTweetData.filter(aTweet => aTweet.tweetIsPossibleThread);
    showHiddenTweets("Threaded Tweets", threadedTweets, hiddenContainer, tweetRenderer);

    const retweetTweets = allTweetData.filter(aTweet => (aTweet.renderDecision.ignore && aTweet.renderDecision.hidden_retweet_ignore));
    showHiddenTweets("Retweet Tweets", retweetTweets, hiddenContainer, tweetRenderer);

    const noLinkTweets = allTweetData.filter(aTweet => (aTweet.renderDecision.ignore && aTweet.renderDecision.hidden_no_links));
    showHiddenTweets("No Link In Tweets", noLinkTweets, hiddenContainer, tweetRenderer);

    const sensitiveTweets = allTweetData.filter(aTweet => (aTweet.renderDecision.ignore && aTweet.renderDecision.hidden_possibly_sensitive));
    showHiddenTweets("Possibly Sensitive Tweets", sensitiveTweets, hiddenContainer, tweetRenderer);

    const hasLinkTweets = allTweetData.filter(aTweet => (aTweet.renderDecision.ignore && aTweet.renderDecision.hidden_has_links));
    showHiddenTweets("Has Links", hasLinkTweets, hiddenContainer, tweetRenderer);

    const hiddenReplies = allTweetData.filter(aTweet => (aTweet.renderDecision.ignore && aTweet.renderDecision.hidden_reply));
    showHiddenTweets("Reply Tweets", hiddenReplies, hiddenContainer, tweetRenderer);

    // delete the final 'next page' button in the hidden tweets because when expanded the user sees two 'next page' buttons back to back
    // const buttons = document.querySelectorAll(".hidden-tweets-section div.nextpage");
    // if(buttons.length>0){
    //     const finalButton = buttons[buttons.length-1];
    //     finalButton.remove();
    // }

    // save hashtag counts
    hashtagCountStorage.saveHashTags(hashtagsCloud);

    // render hashtags
    showLocalHashTagsCloud();
    showTextHashTagsCloud();
}

let hashtagsCloud = {};

function showLocalHashTagsCloud(){

    const tagCount = Object.getOwnPropertyNames(hashtagsCloud).length;

    if (tagCount===0){
        return;
    }

    const container = document.querySelector(".tweets-section");

    const details = document.createElement("details");
    details.classList.add("tagclouds");
    const summary = document.createElement("summary");
    summary.innerText= "HashTags " + tagCount;
    details.appendChild(summary);


    const hashtagCloudCanvas = document.createElement("canvas");
    hashtagCloudCanvas.id = 'local-hashtag-cloud';

    details.appendChild(hashtagCloudCanvas)

    const hovercount = document.createElement("p");
    hovercount.id="hashtag-canvas-hover-count";

    //<input type="range" min="1" max="100" value="50">
    const cloudsizing = document.createElement("input");
    cloudsizing.setAttribute("type","range");
    cloudsizing.setAttribute("min","1");
    cloudsizing.setAttribute("max","100");
    cloudsizing.setAttribute("value","30");
    cloudsizing.id="cloudsizing";

    const redraw = document.createElement("button");
    redraw.innerText="redraw";

    const clearHashTagCount = document.createElement("button");
    clearHashTagCount.innerText="clear counts";

    details.appendChild(hovercount)
    details.appendChild(cloudsizing)
    details.appendChild(redraw)
    details.appendChild(clearHashTagCount)

    container.appendChild(details);

    // todo: only had hashtag cloud when expanded
    details.addEventListener('toggle',()=>{
        drawHashTagCloud();
    })

    cloudsizing.addEventListener('change', e =>{
        updateHashTagCloud(e.target.value);
    });

    redraw.addEventListener('click', () =>{
        updateHashTagCloud(document.getElementById("cloudsizing").value);
    });

    clearHashTagCount.addEventListener('click', ()=>{
        const hashtagCountStorage = new HashtagCountStorage();
        hashtagCountStorage.forUser(twitterUserHandle);
        hashtagCountStorage.deleteHashTags();
        // get any saved counts
        hashtagsCloud = {};
    })
}

function showTextHashTagsCloud(){

    const tagCount = Object.getOwnPropertyNames(hashtagsCloud).length;

    if (tagCount===0){
        return;
    }

    const container = document.querySelector("details.tagclouds");

    const hashtagCloudDiv = document.createElement("div");
    hashtagCloudDiv.id = 'local-hashtag-text';
    hashtagCloudDiv.style.display="flex";
    hashtagCloudDiv.style.flexWrap="wrap";

    container.appendChild(hashtagCloudDiv)

    // todo: only had hashtag cloud when expanded
    container.addEventListener('toggle',()=>{
        drawHashTagTextCloud();
    })

}

let drawnHashTagTextCloud=false;
function drawHashTagTextCloud(){

    if(drawnHashTagTextCloud){return;}

    const container = document.getElementById('local-hashtag-text');

    hashTagsList = Object.getOwnPropertyNames(hashtagsCloud).map(key=>[key, hashtagsCloud[key]]);

    hashTagsList.sort(function(a,b){return a[1]-b[1]})

    const sizes=5;
    const group = Math.ceil(hashTagsList.length/sizes);
    const minSize=1;

    hashTagsList.forEach((item, index) =>{
        const tag = document.createElement("a");
        tag.setAttribute('href', window.location.origin + "/mainview.php?hashtag="+item[0]);
        tag.innerText = item[0] + " (" + item[1] + ")";
        tag.target="_blank";

        const wrapper = document.createElement("span");
        wrapper.style.paddingRight="1em";

        const sizeGroup = Math.floor(index / group);
        const sizeIncrement = sizeGroup * 0.2;
        wrapper.style.fontSize = (minSize + sizeIncrement) + "em";

        wrapper.appendChild(tag);
        container.insertBefore(wrapper, container.firstChild);
        //container.appendChild(wrapper);
    })

    drawnHashTagTextCloud=true;
}




let drawnHashTagCloud=false;
function drawHashTagCloud(){

    const canvas = document.getElementById('local-hashtag-cloud');

    canvas.style.width="100%";
    canvas.style.height=canvas.style.clientWidth/2;

    if(drawnHashTagCloud){return;}

    canvas.width  = 800;
    canvas.height = 400;


    updateHashTagCloud(30);

    drawnHashTagCloud=true;
}

function updateHashTagCloud(scalePercent){

    const canvas = document.getElementById('local-hashtag-cloud');

    canvas.width  = 800;
    canvas.height = 400;

    weighting = 1;
    weighting = weighting + (20*(scalePercent/100));

    //console.log(weighting);

    const hashTagCloudOptions = {
        gridSize: 8,
        weightFactor: weighting,
        fontFamily: 'Average, Times, serif',
        color: function() {
            return (['#f3f2f2', '#87ee11', '#54b8e8'])[Math.floor(Math.random() * 3)]
        },
        backgroundColor: '#333',
        hover: function(item){
            if(item===undefined){return;}
            document.getElementById("hashtag-canvas-hover-count").innerText = item[0] + " - " + item[1];
        },
        click: function(item) {
            window.open(window.location.origin + "/mainview.php?hashtag="+item[0]);
        },
        drawOutOfBound:true,
        list: Object.getOwnPropertyNames(hashtagsCloud).map(key=>[key, hashtagsCloud[key]])
    };

    try {
        WordCloud(canvas, hashTagCloudOptions);
    }catch(err){

    }

}

// TODO: store all hastags in memory/session storage and create a clickable wordcloud
//  like https://observablehq.com/@contervis/clickable-word-cloud
// https://github.com/jasondavies/d3-cloud
// https://stackoverflow.com/questions/20705036/how-do-i-create-link-of-each-word-in-d3-cloud
// this https://github.com/timdream/wordcloud2.js/blob/gh-pages/API.md has click