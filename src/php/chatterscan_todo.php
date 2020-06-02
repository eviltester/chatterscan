<!--

# ChatterScan .com TODO List


- search for user to view feed
- autocomplete search for finding user to view feed
- add site to Bing
- newsletter signup
- blog with feedburner email feed setup
- cookie with last list used to use that by default
- 'mark this as read' button to create cookie which marks this and any tweet older than this as 'read'

## Changes

- 20200602
    - added hashtag search links for linkedin and Google news links on favourites
- 20191213
    - show threaded replies by default i.e. reply to self to indicate threads that would otherwise be ignored, but threads can be important
- 20191205
    - added 'edit search' button when main view is a search
    - refactored filters
    - fixed bug where analytics were added on search view - now analytics only when no params at all
    - fixed bug where viewing user did not shown name in h1 title
- 20191203
    - added 'go sel' and 'edit sel' which allow you to select text and search for it to find related information
- 20191117
    - made feed link open in new window
    - simple prompt to view feed for user
- 20191112
    - Added [feed] link to see a specific users feed using chatterscan functionality - this will be limited to 100K views total per day due to Twitter API limits
- 20190816
    - Moved all links over to GET instead of POST and disabled Google Analytics
- 20190703
    - Added Twitter saved searches to the favourites list
- 20190625
    - Added the hashtags as clickable buttons under view tweet to make discovery easier
- 20190624
    - Added a compare via socialblade link for each twitter profile tweet shown
    - Added a link to tools - twitterlistmanager, twitter analytics, socialblade trends
- 20190622
    - Added a link to easily click through to notifications on Twitter
    - Added a next page button at top of list via JavaScript
- 20190619
    - now displays the twitter identified links, with links to expansion services to use when the shortened URLs have SSL errors
    - centered "view tweet"
    - moved date to top
    - added view tweet link around the date
- 20190618
    - Twitter API provides a set of display range indexes to identify the display characters, but this truncates tweets, so we use this to detect URLs but now display the full Tweet to avoid truncation.
    - Added image display in the tweets
- 20190612
    - Added a next page in each of the expanded 'hidden tweets' sections
    - Added a x of y count in the expanded 'hidden tweets' sections
    - Added navigation to lists and favourites
    - Added content styling div to list and favourites
    - Added mainlist link to todo page
    - Added redirect on not authenticated page
    - Added redirect on logged out page
- 20190605
    - Basic code to make links in tweets are render as clickable links (does not always work)
    - HTML source now contains a markdown version of the list of tweets shown
    - Added some additional styling to center tweets on page
- 20180623
    - Added a logout link to delete the PHP session immediately (the session would have been deleted naturally by PHP, this just does it faster)
- 20180603
    - Opensourced ChatterScan on [Github](https://github.com/eviltester/chatterscan)
- 20180316
    - added ability to view 'subscribed' lists from the list view as well as owned lists
- 20180202
   - changed the favourite links to be POST buttons to avoid data in the URL
- 20180201
   - added a simple 'favourites' config where you can create favourite hashtags or searches
        - these are stored in your browser localstorage, not on the server
        - if you use a different browser, your favourites will not be there
        - use the same browser to keep your favourites
   - Also you can 'see' ignored tweets by expanding the 'View Any Available Hidden Tweets' at the bottom of the page
- 20180112
   - fixed bug where it did not recognise links at first position in the tweet
- 20180105
   - fixed bug with "Next Page Button not working with list view"
   - added a Show Only Retweets filter
   - added functionality to show any twitter error messages from API e.g. Rate Limiting Messages
       - home feed is rate limited to 15 messages per 15 minutes, lists have 180 messages
- 20180104
   - fixed bug with "from_tweet_id="
- 20180103
   - made [Next Page] link a button which POSTs information to hide details from Google Analytics
- 20180102
    - button to allow re-tweets to show (links)
    - also links to allow including retweets and with no links
    - allows chatterscan to include the chatter and act as a normal twitter client (with no images displayed)
- 20171228
    - add site to Google
    - sitemap.xml
    - better formatted intro page
- 20171226
    - investigate purecss.io for base styling layer
    - added some basic styling for the index pages and app access buttons
    - added home feed into list of lists to make it easy to go back to using home feed
- 20171225
    - Added a 'Choose a List' link to a 'list' choosing view to allow easy list selection
    - list of lists
- 20171221
    - meta data for SEO
- 20171220
    - added google analytics
    - favicon
    - add Let's Encrypt https to the site
    - headers footers for navigation
    - create logo
    - ChatterScan .com created and live
- 20171219 internal prototype created

-->


<div class="body-text">




    <h1><a id="ChatterScan_com_TODO_List_0"></a>ChatterScan .com TODO List</h1>
    <ul>
        <li>add site to Bing</li>
        <li>newsletter signup</li>
        <li>blog with feedburner email feed setup</li>
        <li>cookie with last list used to use that by default</li>
        <li>'mark this as read' button to create cookie which marks this and any tweet older than this as 'read'</li>
    </ul>

    <ul><li><a href='/mainview.php'>View Main Feed</a></li></ul>

    <h2><a id="Changes_10"></a>Changes</h2>


    <ul>
        <li> 20200602
            <ul>
                <li> added hashtag search links for linkedin and Google news links on favourites</li>
            </ul>
        </li>
        <li> 20191213
            <ul>
                <li> show threaded replies by default i.e. reply to self to indicate threads that would otherwise be ignored, but threads can be important</li>
            </ul>
        </li>
        <li>20191205
            <ul>
                <li>added 'edit search' button when main view is a search</li>
                <li>refactored filters</li>
                <li>fixed bug where analytics were added on search view - now analytics only when no params at all</li>
                <li>fixed bug where viewing user did not shown name in h1 title</li>
            </ul>
        </li>

        <li>20191203
            <ul>
                <li>added 'go sel' and 'edit sel' which allow you to select text and search for it to find related information</li>
            </ul>
        </li>
        <li>20191117
        <ul>
            <li>made feed link open in new window</li>
            <li>simple prompt to view feed for user</li>
        </ul>
        </li>
        <li>20191112
            <ul><li>Added [feed] link to see a specific users feed using chatterscan functionality - this will be limited to 100K views total per day due</li></ul>
        </li>
        <li>20190816
            <ul>
                <li>Moved all links over to GET instead of POST and disabled Google Analytics</li>
            </ul>
        </li>
        <li>20190703
            <ul>
                <li>Added Twitter saved searches to the favourites list</li>
            </ul>
        </li>
        <li>20190625
            <ul>
                <li>Added the hashtags as clickable buttons under view tweet to make discovery easier</li>
            </ul>
        </li>
        <li>20190624
            <ul>
                <li>Added a compare via socialblade link for each twitter profile tweet shown</li>
                <li>Added a link to tools - twitterlistmanager, twitter analytics, socialblade trends</li>
            </ul>
        </li>
        <li>20190622
            <ul>
                <li>Added a link to easily click through to notifications on Twitter</li>
                <li>Added a next page button at top of list via JavaScript</li>
            </ul>
        </li>
        <li>20190619
            <ul>
                <li>now displays the twitter identified links, with links to expansion services to use when the shortened URLs have SSL errors</li>
                <li>centered "view tweet"</li>
                <li>moved date to top</li>
                <li>added view tweet link around the date</li>
            </ul>
        </li>
        <li>20190618
            <ul>
                <li>Twitter API provides a set of display range indexes to identify the display characters, but this truncates tweets, so we use this to detect URLs but now display the full Tweet to avoid truncation.</li>
                <li>Added image display in the tweets</li>
            </ul>
        </li>
        <li>20190612
            <ul>
                <li>Added a next page in each of the expanded 'hidden tweets' sections</li>
                <li>Added a x of y count in the expanded 'hidden tweets' sections</li>
                <li>Added navigation to lists and favourites</li>
                <li>Added content styling div to list and favourites</li>
                <li>Added mainlist link to todo page</li>
                <li>Added redirect on not authenticated page</li>
                <li>Added redirect on logged out page</li>
            </ul>
        </li>
        <li>20190605
            <ul>
                <li>Basic code to make links in tweets are render as clickable links (does not always work)</li>
                <li>HTML source now contains a markdown version of the list of tweets shown</li>
                <li>Added some additional styling to center tweets on page and some background colour</li>
            </ul>
        </li>
        <li>20180623
            <ul>
                <li>Added a logout link to delete the PHP session immediately (the session would have been deleted naturally by PHP, this just does it faster)</li>
            </ul>
        </li>
        <li>20180603
            <ul>
                <li>Opensourced ChatterScan on <a href="https://github.com/eviltester/chatterscan">Github</a></li>
            </ul>
        </li>
        <li>20180316
            <ul>
                <li>added ability to view 'subscribed' lists from the list view as well as owned lists</li>
            </ul>
        </li>
        <li>20180202
            <ul>
                <li>changed the favourite links to be POST buttons to avoid data in the URL</li>
            </ul>
        </li>
        <li>20180201
            <ul>
                <li>added a simple ‘favourites’ config where you can create favourite hashtags or searches
                    <ul>
                        <li>these are stored in your browser localstorage, not on the server</li>
                        <li>if you use a different browser, your favourites will not be there</li>
                        <li>use the same browser to keep your favourites</li>
                    </ul>
                </li>
                <li>Also you can 'see' ignored tweets by expanding the 'View Any Available Hidden Tweets' at the bottom of the page</li>
            </ul>
        </li>
        <li>20180112
            <ul>
                <li>fixed bug where it did not recognise links at first position in the tweet</li>
            </ul>
        </li>
        <li>20180105
            <ul>
                <li>fixed bug with “Next Page Button not working with list view”</li>
                <li>added a Show Only Retweets filter</li>
                <li>added functionality to show any twitter error messages from API e.g. Rate Limiting Messages
                    <ul>
                        <li>home feed is rate limited to 15 messages per 15 minutes, lists have 180 messages</li>
                    </ul>
                </li>
            </ul>
        </li>
        <li>20180104
            <ul>
                <li>fixed bug with “from_tweet_id=”</li>
            </ul>
        </li>
        <li>20180103
            <ul>
                <li>made [Next Page] link a button which POSTs information to hide details from Google Analytics</li>
            </ul>
        </li>
        <li>20180102
            <ul>
                <li>button to allow re-tweets to show (links)</li>
                <li>also links to allow including retweets and with no links</li>
                <li>allows chatterscan to include the chatter and act as a normal twitter client (with no images displayed)</li>
            </ul>
        </li>
        <li>20171228
            <ul>
                <li>add site to Google</li>
                <li>sitemap.xml</li>
                <li>better formatted intro page</li>
            </ul>
        </li>
        <li>20171226
            <ul>
                <li>investigate <a href="http://purecss.io">purecss.io</a> for base styling layer</li>
                <li>added some basic styling for the index pages and app access buttons</li>
                <li>added home feed into list of lists to make it easy to go back to using home feed</li>
            </ul>
        </li>
        <li>20171225
            <ul>
                <li>Added a ‘Choose a List’ link to a ‘list’ choosing view to allow easy list selection</li>
                <li>list of lists</li>
            </ul>
        </li>
        <li>20171221
            <ul>
                <li>meta data for SEO</li>
            </ul>
        </li>
        <li>20171220
            <ul>
                <li>added google analytics</li>
                <li>favicon</li>
                <li>add Let’s Encrypt https to the site</li>
                <li>headers footers for navigation</li>
                <li>create logo</li>
                <li>ChatterScan .com created and live</li>
            </ul>
        </li>
        <li>20171219 internal prototype created</li>
    </ul>
</div>
