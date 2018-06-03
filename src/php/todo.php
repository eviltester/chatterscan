<!DOCTYPE html><html>
<head>
<title>ChatterScan.com Todo List</title>
    <?php
    require "config/config.php";
    require "includes/metatags.php";
    require "includes/chatterscan_funcs.php";
    $metatags["description"] = "Product roadmap for ChatterScan.com";
    outputMetaTags();
    ?>
    <?php require "config/env/".getEnvironmentName()."/ga.php";  ?>
</head>
<body>

<?php
require "includes/header.php";
?>


<?php
$include_file="config/branding/includes/chatterscan_todo.php";
file_exists($include_file) AND include $include_file;
?>

<?php access_app_button("Access The Application Here"); ?>

<?php
require "includes/footer.php";
?>

</body></html>