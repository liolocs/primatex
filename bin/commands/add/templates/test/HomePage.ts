export const homePageContent = `import { expect, Page } from "@playwright/test";
import { Fixture, Given, Then } from "playwright-bdd/decorators";
import { test } from "./fixtures.ts";
export
@Fixture<typeof test>("homePage")
class HomePage {
    constructor(public page: Page) {}
    @Given("I am on the home page")
    async goToHomePage() {
        await this.page.goto("http://localhost:6161/");
    }
    @Then( "I should see {string} text")
    async shouldSeeText(text: string) {
        await expect(this.page.getByText(text)).toBeVisible();
    }
}
`;

