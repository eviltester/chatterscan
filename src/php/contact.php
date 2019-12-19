<!DOCTYPE html>
<html>
<head>

    <title>Contact And Feedback Page</title>
    <?php
    require "config/config.php";
    require "includes/metatags.php";
    require "includes/chatterscan_funcs.php";
    $metatags["description"] = "Contact and feedback.";
    outputMetaTags();
    ?>
    <?php require "config/env/".getEnvironmentName()."/ga.php";  ?>

</head>

<body>

<?php
require "includes/header.php";
?>

<?php access_app_button("Access The Application Here"); ?>

<?php
$include_file="config/branding/includes/chatterscan_feedback.php";
file_exists($include_file) AND include $include_file;
?>


<?php
require "includes/footer.php";
?>

</body></html>
