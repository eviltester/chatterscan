class ShowTweetDecider{

    // reasons
    hidden_retweet_ignore=false;
    hidden_possibly_sensitive=false;
    hidden_no_links=false;
    hidden_has_links=false;
    hidden_reply=false;
    ignore=false;

    // decision log
    debug_info = [];

    decideIfTweetShown(filters, value){

        this.debug_info = [];

        this.debug_info["decideIfTweetShown"] = "processing tweet to decide if shown";

        if(filters.includeRetweets==false){
            // if it is a retweet then ignore
            if(value.is_quote_status==true){
                this.ignore=true;
                this.debug_info["ignore_retweets"] = "Ignored because is_quote_status reported tweet as a quote";
                this.hidden_retweet_ignore=true;
            }else{
                this.debug_info["ignore_retweets"] = "Included because is_quote_status reported tweet as not being a quote";
            }
        }

        // todo: if threadedreplies is on then it overrides the 'reply' settings need to make that clear in the GUI
        if(filters.showThreadedReplies==true){
            if(value.tweetIsReply==true){
                if(value.tweetIsPossibleThread==true){
                    // show it
                    this.debug_info["threaded_reply"] = "Included because threaded reply";
                }else {
                    this.ignore = true;
                    this.debug_info["threaded_reply"] = "Ignored because not a threaded reply";
                    this.hidden_reply = true;
                }
            }
        }

        // if it is possibly sensitive then ignore
        // supposed to only be set if tweet has a link - but that isn't true
        // todo: this needs to be added to the GUI as a filter because currently it is hard coded
        if(value.possibly_sensitive==true) {
            this.ignore = true;
            this.debug_info["possibly_sensitive"] = "Ignored because Marked as possibly_sensitive";
            this.hidden_possibly_sensitive=true;
        }else{
            this.debug_info["possibly_sensitive"] = "Included because not Marked as possibly_sensitive";
        }


        // if it does not include http - could do this based on the urls array being undefined or length 0
        // if(value?.urls?.length==0){
        if (value.hasHttpLink==false) {
            this.debug_info["included http?"] = "It did not include http";
            if(filters.includeWithoutLinks==false) {
                this.ignore = true;
                this.debug_info["include_without_links"] = "IGNORED we are set to not include_without_links";
                this.hidden_no_links=true;
            }else{
                this.debug_info["include_without_links"] = "SHown we are set to include_without_links";
            }
        }

        return this.ignore==false;
    }

}


function decideStatusOfArrayOfTweets(currentFilters, theTweets){

    const decisionInfo = {debug_info : [], first_id: 0, max_id:0, number_processed:0, shown_count:0};

    theTweets.forEach (aTweet => {

        // debug_var_dump_as_html_comment("Tweet Data that is about to be processed", aTweet);

        showTweetDecider = new ShowTweetDecider();
        showTweetDecider.decideIfTweetShown(currentFilters, aTweet);
        aTweet.renderDecision = showTweetDecider;

        if(aTweet.renderDecision.ignore==false){
            decisionInfo.shown_count++;
        }
        //decisionInfo.debug_info.concat(aTweet.debug_info);

        if(decisionInfo.first_id==0){
            decisionInfo.first_id = aTweet.id;
        }
        decisionInfo.max_id = aTweet.id;
        decisionInfo.number_processed++;
    });

    return decisionInfo;
}