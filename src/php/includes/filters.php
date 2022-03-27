<?php

require_once('twitter-api-wrapper.php');

class CurrentURLParams{

    public $cachedParams="";

    // get all the shared filter params to add to urls
    function getSharedFilterParams(){

        $prefix = "?";
        $output = "";

        foreach($_GET as $key=>$val)
        {
            // ignore from_tweet_id
            $processThis = true;

            if(strpos($key, 'from_tweet_id') > -1){
                $processThis=false;
            }
            if(strpos($key, 'screen_name') > -1){
                $processThis=false;
            }
            if(strpos($key, 'list') > -1){
                $processThis=false;
            }
            if(strpos($key, 'list_id') > -1){
                $processThis=false;
            }
            if(strpos($key, 'searchterm') > -1){
                $processThis=false;
            }
            if(strpos($key, 'hashtag') > -1){
                $processThis=false;
            }
            if(strpos($key, 'terms') > -1){
                $processThis=false;
            }

            if($processThis){
                $output = $output.$prefix.$key."=".urlencode($val);
                $prefix = "&";
            }
        }

        $this->cachedParams = $output;

        return $output;
    }

    function getParamValue($sought){

        foreach($_GET as $key=>$val)
        {
            if(strpos($key, $sought) > -1){
                return $val;
            }
        }

        return "";
    }

    public function getParams(){
        if(strlen($this->cachedParams)==0){
            return $this->getSharedFilterParams();
        }
        return $this->cachedParams;
    }
}

class ChatterScanFilters{

    // simplify
    // show_replies
    // show_retweets
    // hide_when_no_link

    public $ignore_replies=true;
    public $hide_seen_already=true;

    public $ignore_retweets = false;

    public $show_threaded_replies=true;

    public $list = "";
    public $list_id="";
    public $hashtag = "";
    public $search = "";
    public $from_tweet_id="";
    public $screen_name="";

    public $include_without_links = false;

    public $baseNextURL = "mainview.php";

    function setNextUrl($newNextUrl){
        $this->baseNextURL = $newNextUrl;
    }



    function setFiltersFromRequest(&$params, &$extra_params, $screen_name){

        if (isset($_REQUEST['from_tweet_id'])){
            $this->from_tweet_id= htmlspecialchars($_REQUEST['from_tweet_id']);
            if(!(""===$this->from_tweet_id)){
                // fix bug where if this is blank then nothing is shown
                // from_tweet_id=
                $extra_params["from_tweet_id"] =$this->from_tweet_id;
                $params["max_id"] = $this->from_tweet_id;
            }
        }

        if (isset($_REQUEST['ignore_replies'])){
            $exclude_replies= getBooleanValueFromParam("ignore_replies");
            $extra_params["ignore_replies"] = getTextForBooleanValue($exclude_replies);
            $params["exclude_replies"] = $exclude_replies;
            //echo '<p>Ignore Replies '.getTextForBooleanValue($exclude_replies).'</p>';
            $this->ignore_replies=$exclude_replies;
        }


        if (isset($_REQUEST['hideSeenTweets'])){
            $hideseen= getBooleanValueFromParam("hideSeenTweets");
            $extra_params["hideSeenTweets"] = getTextForBooleanValue($hideseen);
            //echo '<p>Ignore Replies '.getTextForBooleanValue($exclude_replies).'</p>';
            $this->hide_seen_already=$hideseen;
        }

        if (isset($_REQUEST['threaded_replies'])){
            $should_threaded_replies= getBooleanValueFromParam("threaded_replies");
            $extra_params["threaded_replies"] = getTextForBooleanValue($should_threaded_replies);
            //echo '<p>Ignore Replies '.getTextForBooleanValue($exclude_replies).'</p>';
            $this->show_threaded_replies=$should_threaded_replies;
        }

        if($this->show_threaded_replies){
            $params["exclude_replies"] = false;
        }

        if (isset($_REQUEST['include_retweets'])){
            $this->include_retweets= getBooleanValueFromParam('include_retweets');
            $extra_params["include_retweets"] = getTextForBooleanValue($this->include_retweets);
            $params["include_rts"] = $this->include_retweets;
            //echo '<p>Include Retweets '.getTextForBooleanValue($include_retweets).'</p>';
            $this->ignore_retweets=!$this->include_retweets;
        }


        if (isset($_REQUEST['list'])) {
            $this->list = htmlspecialchars($_REQUEST['list']);
            if (isset($_REQUEST['list_id'])) {
                $this->list_id = htmlspecialchars($_REQUEST['list_id']);
                $extra_params["list_id"]=$this->list_id;
            }
            $extra_params["list"] = $this->list;
            $params["slug"] = $this->list;
            $params["list_id"] = $this->list_id;

            if (!$this->is_using_list_id()) {
                $params["owner_screen_name"] = $screen_name;
            }
        }

        if (isset($_REQUEST['hashtag'])){
            $this->hashtag = str_replace("#", "%23", htmlspecialchars($_REQUEST['hashtag']));
            $extra_params["hashtag"] = $this->hashtag;

            // make sure there is a hashtag symbol
            if(strpos($this->hashtag, "%23") === 0){
            }else{
                $this->hashtag = "%23".$this->hashtag;
            }
            $params["q"] = $this->hashtag;
        }

        if (isset($_REQUEST['searchterm'])){
            $this->search = htmlspecialchars($_REQUEST['searchterm']);
            $extra_params["searchterm"] = $this->search;
            $params["q"] = $this->search;
        }

        // https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline
        if (isset($_REQUEST['screen_name'])){
            $this->screen_name = htmlspecialchars($_REQUEST['screen_name']);
            $extra_params["screen_name"] = $this->screen_name;
            $params["screen_name"] = $this->screen_name;
        }

        if(isset($_REQUEST['include_without_links'])){
            $booleanVal = getBooleanValueFromParam("include_without_links");
            $extra_params["include_without_links"] = getTextForBooleanValue($booleanVal);
            $this->include_without_links=$booleanVal;
        }
    }

    function is_using_list(){
        return !($this->list === "");
    }

    function is_screen_name(){
        return !($this->screen_name === "");
    }

    function is_using_list_id(){
        return !($this->list_id === "");
    }

    function is_hashtag_search(){
        return !($this->hashtag === "");
    }

    function is_search(){
        return !($this->search === "");
    }


    function buildMainViewUrlFrom_including($theParams, $keyToInclude, $valueForKey){

        $nextURL = $this->baseNextURL;

        $paramSeparator = "?";

        $processedGivenKey=false;
        foreach($theParams as $extra_param_key => $extra_param_value){
            if(strcmp($keyToInclude, $extra_param_key)==0){
                // found the key to override
                $nextURL = "$nextURL$paramSeparator$extra_param_key=$valueForKey";
                $processedGivenKey=true;
            }else{
                $nextURL = "$nextURL$paramSeparator$extra_param_key=$extra_param_value";
            }
            $paramSeparator="&";
        }

        if(!$processedGivenKey){
            $nextURL = "$nextURL$paramSeparator$keyToInclude=$valueForKey";
        }

        return $nextURL;
    }

    // copied from filters.js
    function echoFilterControlsArea(){
        echo <<<EOT
<div id='filterscontrolarea' class="filters-control-area">
        <div class="filter-options">
            <p>Filters:</p>
            <div id='filteroptions'>
                <ul class="filter-checkbox-options">  
                <li>         
                    <input type="checkbox" id="includeWithoutLinks" name="includeWithoutLinks">
                        <label for="includeWithoutLinks">Show Posts Without Links</label>
                </li>
                <li> 
                    <input type="checkbox" id="includeRetweets" name="includeRetweets">
                        <label for="includeRetweets">Show Retweets</label>
                </li>
                <li>                        
                    <input type="checkbox" id="includeReplies" name="includeReplies">
                        <label for="includeReplies">Show Replies</label>
                </li>
                <li>                         
                    <input type="checkbox" id="showSeenTweets" name="showSeenTweets">
                        <label for="showSeenTweets">Show Seen Tweets</label>
                </li>
                <li>
                    <input type="checkbox" id="showThreadedReplies" name="showThreadedReplies">
                        <label for="showThreadedReplies">Show Threaded Replies</label>
                </li>          
                </ul> 
            </div>     
            
            <div class="filter-buttons">
                <button id="applyFiltersButton">Apply Filters</button>
                <button id="clearSessionDupeTrackingButton">Clear Session Dupe Tracking</button>
            </div>
        
        </div>

        <hr/>
</div>
EOT;

    }

    function buildMainViewFormPostButtonFrom_including($theParams, $keyToInclude, $valueForKey, $buttonText){

        $nextURL = $this->baseNextURL;

        /*
         *
         <form action="mainview.php" method="POST">
             <input type="hidden" name="key" value="value">
             <button type="submit" value="Next Page"/>
         </form>
        */

        $formHTML ="";

        $buttonHTML = "<button class='button-next-page pure-button' type='submit' value='$buttonText'>$buttonText</button>";

        // I was using a POST to avoid Google Analytics, but I'll just switch off analytics instead
        // after all, no-one is using it
            /*
            $formHTML = "<form action='mainview.php' method='POST'>\n";

            $processedGivenKey=false;
            foreach($theParams as $extra_param_key => $extra_param_value){

                if(strcmp($keyToInclude, $extra_param_key)==0){
                    // found the key to override
                    $formHTML="$formHTML\n<input type='hidden' name='$keyToInclude' value='$valueForKey'/>";
                    $processedGivenKey=true;
                }else{
                    $formHTML="$formHTML\n<input type='hidden' name='$extra_param_key' value='$extra_param_value'/>";
                }
            }

            if(!$processedGivenKey){
                $formHTML="$formHTML\n<input type='hidden' name='$keyToInclude' value='$valueForKey'/>";
            }


            $formHTML="$formHTML $buttonHTML\n";
            $formHTML="$formHTML</form>\n";
            */

        $getUrl = $this->buildMainViewUrlFrom_including($theParams, $keyToInclude, $valueForKey);
        $formHTML="$formHTML<p><a data-filter-url='true' href='$getUrl'>$buttonHTML</a></p>\n";
        return $formHTML;
    }

    function buildMainViewUrlFrom_excluding($theParams, $keyToExclude){

        $nextURL = $this->baseNextURL;
        $paramSeparator = "?";

        $processedGivenKey=false;
        foreach($theParams as $extra_param_key => $extra_param_value){
            if(strcmp($keyToExclude, $extra_param_key)==0){
                $processedGivenKey=true;
            }else{
                $nextURL = "$nextURL$paramSeparator$extra_param_key=$extra_param_value";
                $paramSeparator = "&";
            }
        }

        // if we did not process it then that is fine, we did not want it anyway

        return $nextURL;
    }

    function link_to_show($aURL,$theText, $description = ""){
//        echo "<li> $description <a href='$aURL'>[$theText]</a></li>";
    }

    function link_to_hide($aURL,$theText, $description = ""){
//        echo "<li> $description <a href='$aURL'>[$theText]</a></li>";
    }

    function echo_filters_menu($extra_params)
    {

        if(!("" === $this->from_tweet_id)){
            $aTweetId = $this->from_tweet_id;
            $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "from_tweet_id");
            echo "<div id='readingfrom'>";
            //echo "<h2>Position</h2>";
            echo "<p>Reading from $aTweetId, <a href='$theUrlToShow' class='pure-button'>Back To Start</a></p>";
            echo "</div>";
        }

        echo "<div id='filterscontrol'>";

        // prevent some page jumping by outputing the base HTML
        $this->echoFilterControlsArea();

        //echo "<details>";

        $summary = "Filters: ";

//        echo "<h2>Filters</h2>";

//        echo "<div id='filtersmenu'></div>";


//        echo "<ul>";


    // show links to configure

        // exclude/include posts with links
        if ($this->include_without_links === true) {
            // true
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "include_without_links", "false");
            $this->link_to_show($theUrlToShow, "Only Show Posts With Links", "Posts Without Links Are Shown");
            $summary = $summary." Without Links Shown |";
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "include_without_links", "true");
            $this->link_to_hide($theUrlToShow, "Show Posts Without Links", "Showing Only Posts With Links");
            $summary = $summary." Links Only |";
        }


// exclude/include retweets if $extra_params does include "include_retweets"
// - if value is 'true' then button should say [Exclude Retweets]
//     - and url should not include "include_retweets"
// - if value is 'false' then button should say [Include Retweets]
//     - and url should include "include_retweets=true"
    if (!$this->ignore_retweets) {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "include_retweets", "false");
            $this->link_to_hide($theUrlToShow, "Hide Retweets", "Showing Retweets");
            $summary = $summary." Retweets Shown |";
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "include_retweets", "true");
            $this->link_to_show($theUrlToShow, "Show Retweets", "Retweets are Hidden");
            $summary = $summary." Retweets Hidden |";
        }


// exclude/include replies
// if $ignore_replies === true then
//       - show button [Show Replies] and url should include all extra params and "ignore_replies=false"
// - if $ignore_replies === false then
//       - show button [Ignore Replies] and url should include all extra params without "ignore_replies"
        if ($this->ignore_replies === true) {
            // true
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "ignore_replies", "false");
            $this->link_to_show($theUrlToShow, "Show Replies", "Replies are Hidden");
            $summary = $summary." Replies Hidden |";
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "ignore_replies", "true");
            $this->link_to_hide($theUrlToShow, "Hide Replies", "Showing Replies");
            $summary = $summary." Replies Shown |";
        }

        if ($this->hide_seen_already === true) {
            // true
            $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "hideSeenTweets", "false");
            $this->link_to_show($theUrlToShow, "Show Seen Tweets", "Dupes and Historic are Hidden");
            $summary = $summary." Hiding Seen |";
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "hideSeenTweets", "true");
            $this->link_to_hide($theUrlToShow, "Hide Seen Tweets", "Dupes And historic are Shown");
        }


        if ($this->show_threaded_replies === true) {
            // true
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "threaded_replies", "false");
            $this->link_to_show($theUrlToShow, "Hide Threaded Replies", "Threaded Replies Are Shown");
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "threaded_replies", "true");
            $this->link_to_hide($theUrlToShow, "Show Threaded Replies", "Threaded Replies Are Hidden");
        }



//        echo "</ul>";
//        echo "<button onclick='window.sessionStorage.clear()'>Clear Session Dupe Tracking</button>";
//        echo "<p><strong>".$summary."</strong></p>";
//        echo "<hr/>";

        //echo "</details>";
        echo "</div>";
    }

    public function buildButtonOrLink_including($extra_params, $keyToInclude, $valueForKey, $textToShow)
    {
        $returnHtml = "";
        if(isset($_REQUEST['show_links'])) {
            $nextURL = $this->buildMainViewUrlFrom_including($extra_params, $keyToInclude, $valueForKey);
            $returnHtml = $returnHtml."<h2><a href='$nextURL'>$textToShow</a></h2>";
        }
        $returnHtml = $returnHtml.$this->buildMainViewFormPostButtonFrom_including($extra_params,$keyToInclude,$valueForKey, $textToShow);
        return $returnHtml;
    }

    public function showButtonOrLink_including($extra_params, $keyToInclude, $valueForKey, $textToShow)
    {
        echo $this->buildButtonOrLink_including($extra_params, $keyToInclude, $valueForKey, $textToShow);
//        if(isset($_REQUEST['show_links'])) {
//            $nextURL = $this->buildMainViewUrlFrom_including($extra_params, $keyToInclude, $valueForKey);
//            echo "<h2><a href='$nextURL'>$textToShow</a></h2>";
//        }
//        echo $this->buildMainViewFormPostButtonFrom_including($extra_params,$keyToInclude,$valueForKey, $textToShow);
    }
}

$filters = new ChatterScanFilters;
?>