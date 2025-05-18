/**
 * Background script for the Password Generator extension
 */

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
  } else if (details.reason === "update") {
  }
});
