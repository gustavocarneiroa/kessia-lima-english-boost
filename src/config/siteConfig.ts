export interface SiteConfig {
  waitingListOnly: boolean;
  waitingListUrl: string;
}

export const siteConfig: SiteConfig = {
  waitingListOnly: true, // Change to true when only waiting list is available
  waitingListUrl: "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform",
};