<?php
class ChatterScanFilters{


    public $ignore_replies=true;
    public $ignore_retweets = true;
    public $list = "";
    public $list_id="";
    public $hashtag = "";
    public $search = "";
    public $from_tweet_id="";
    public $screen_name="";
    public $include_links = true;
    public $include_without_links = false;
    public $only_include_retweets = false;

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

        if (isset($_REQUEST['include_retweets'])){
            $this->include_retweets= getBooleanValueFromParam('include_retweets');
            $extra_params["include_retweets"] = getTextForBooleanValue($this->include_retweets);
            $params["include_rts"] = $this->include_retweets;
            //echo '<p>Include Retweets '.getTextForBooleanValue($include_retweets).'</p>';
            $this->ignore_retweets=!$this->include_retweets;
        }

        if (isset($_REQUEST['only_include_retweets'])){
            $this->only_include_retweets= getBooleanValueFromParam('only_include_retweets');
            $extra_params["only_include_retweets"] = getTextForBooleanValue($this->only_include_retweets);
            $params["mandatory_retweets"] = $this->only_include_retweets;
            if($this->only_include_retweets){
                $params["include_rts"] = true;
                //echo '<p>Include Retweets '.getTextForBooleanValue($include_retweets).'</p>';
                $this->ignore_retweets=false;
            }
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

        if(isset($_REQUEST['exclude_links'])){
            $booleanVal = getBooleanValueFromParam("exclude_links");
            $extra_params["exclude_links"] = getTextForBooleanValue($booleanVal);
            $this->include_links=!$booleanVal;
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
        $nextURL = "mainview.php";
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

    function buildMainViewFormPostButtonFrom_including($theParams, $keyToInclude, $valueForKey, $buttonText){

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
        $formHTML="$formHTML<p><a href='$getUrl'>$buttonHTML</a></p>\n";
        return $formHTML;
    }

    function buildMainViewUrlFrom_excluding($theParams, $keyToExclude){
        $nextURL = "mainview.php";
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
        echo "<li> $description <a href='$aURL'>[$theText]</a></li>";
    }

    function link_to_hide($aURL,$theText, $description = ""){
        echo "<li> $description <a href='$aURL'>[$theText]</a></li>";
    }

    function echo_filters_menu($extra_params)
    {
        echo "<h2>Filters</h2>";

        if(!("" === $this->from_tweet_id)){
            $aTweetId = $this->from_tweet_id;
            $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "from_tweet_id");
            echo "<p>Continue from $aTweetId, [<a href='$theUrlToShow'>Back To Start</a>]</p>";
        }

        echo "<ul>";

    // show links to configure
    // include retweets if $extra_params does not include "include_retweets" then
    // - show button [Include Retweets]
    // - this should be a url with all the extra_params including "include_retweets=true"
        if (!array_key_exists("include_retweets", $extra_params)) {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "include_retweets", "true");
            $this->link_to_show($theUrlToShow, "Show Retweets", "Retweets are Hidden");
        }

// exclude/include retweets if $extra_params does include "include_retweets"
// - if value is 'true' then button should say [Exclude Retweets]
//     - and url should not include "include_retweets"
// - if value is 'false' then button should say [Include Retweets]
//     - and url should include "include_retweets=true"
        if (array_key_exists("include_retweets", $extra_params)) {
            $array_key_value = $extra_params["include_retweets"];
            if (strcmp("true", $array_key_value) === 0) {
                // true
                $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "include_retweets");
                $this->link_to_hide($theUrlToShow, "Hide Retweets", "Showing Retweets");
            } else {
                $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "include_retweets", "true");
                $this->link_to_show($theUrlToShow, "Show Retweets", "Retweets are Hidden");
            }
        }

        // can force display of only retweets
        echo "<ul>";
        if (array_key_exists("only_include_retweets", $extra_params)) {
            $array_key_value = $extra_params["only_include_retweets"];
            if (strcmp("true", $array_key_value) === 0) {
                // true
                $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "only_include_retweets");
                $this->link_to_hide($theUrlToShow, "Do Not Only Show Retweets", "Only Showing Retweets");
            } else {
                $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "only_include_retweets", "true");
                $this->link_to_show($theUrlToShow, "Show Only Retweets", "Showing Any Tweets");
            }
        }else{
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "only_include_retweets", "true");
            $this->link_to_show($theUrlToShow, "Show Only Retweets", "Showing Any Tweets");
        }
        echo "</ul>";


// exclude/include replies
// if $ignore_replies === true then
//       - show button [Show Replies] and url should include all extra params and "ignore_replies=false"
// - if $ignore_replies === false then
//       - show button [Ignore Replies] and url should include all extra params without "ignore_replies"
        if ($this->ignore_replies === true) {
            // true
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "ignore_replies", "false");
            $this->link_to_show($theUrlToShow, "Show Replies", "Replies are Hidden");
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "ignore_replies");
            $this->link_to_hide($theUrlToShow, "Hide Replies", "Showing Replies");
        }


// exclude/include posts with links
// - if $include_links === true then
//       - show button [Exclude Posts With Links] and url should inlcude all extra params and "exclude_links=true"
// - if $include_links === false then
//       - show button [Include Posts With Links] and url should include all extra params without "exclude_links"
        if ($this->include_links === true) {
            // true
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "exclude_links", "true");
            $this->link_to_hide($theUrlToShow, "Hide Posts With Links", "Showing Only Posts With Links");
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "exclude_links");
            $this->link_to_show($theUrlToShow, "Show Posts With Links", "Posts With Links Are Hidden");
        }


// exclude/include posts without links
// - if $include_without_links === true then
//       - show button [Exclude Posts Without Links] and url should inlcude all extra params without "include_without_links"
// - if $include_without_links === false then
//       - show button [Include Posts Without Links] and url should include all extra params and "include_without_links=true"
        if ($this->include_without_links === true) {
            // true
            $theUrlToShow = $this->buildMainViewUrlFrom_excluding($extra_params, "include_without_links");
            $this->link_to_hide($theUrlToShow, "Hide Posts Without Links", "Showing Posts Without Links");
        } else {
            $theUrlToShow = $this->buildMainViewUrlFrom_including($extra_params, "include_without_links", "true");
            $this->link_to_show($theUrlToShow, "Show Posts Without Links", "Posts Without Links Are Hidden");
        }

        echo "</ul>";
        echo "<hr/>";
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