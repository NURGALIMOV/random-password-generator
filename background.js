/**
 * Background script for the Password Generator extension
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Password Generator Extension installed");
  } else if (details.reason === "update") {
    console.log("Password Generator Extension updated");
  }
});
