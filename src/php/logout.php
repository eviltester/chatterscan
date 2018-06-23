<?php
//http://php.net/manual/en/function.session-destroy.php
// Initialize the session.
// If you are using session_name("something"), don't forget it now!
session_start();

// Unset all of the session variables.
$_SESSION = array();

// If it's desired to kill the session, also delete the session cookie.
// Note: This will destroy the session, and not just the session data!
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Finally, destroy the session.
session_destroy();
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require "includes/debug_functions.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
?>
<html>
<head>
    <title>Showing Tweets with links | ChatterScan</title>
    <?php
    require "includes/metatags.php";
    $metatags["description"] = "Showing the tweets from your home feed or list that contain links and valuable information only.";
    outputMetaTags();
    ?>
    <?php require "config/env/".getEnvironmentName()."/ga.php";  ?>
</head>

<body>

<?php
require "includes/header.php";
?>

<h1>You are now logged out</h1>

<h2><a href="/">return to main page</a></h2>


<?php
require "includes/footer.php";
?>
</body>
</html>