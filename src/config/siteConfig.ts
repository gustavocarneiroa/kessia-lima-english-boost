export interface SiteConfig {
  waitingListOnly: boolean;
  waitingListUrl: string;
}

export const siteConfig: SiteConfig = {
  waitingListOnly: true, // Change to true when only waiting list is available
  waitingListUrl: "https://docs.google.com/forms/d/e/1FAIpQLScaStZfmkPG-xIztH49lc67iOfXRlnXRDos0wcsJZ7jgm9LhQ/viewform"
};