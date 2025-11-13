export const fixturesContent = `import { test as base } from "playwright-bdd";
import { HomePage } from "./HomePage.ts";

type Fixtures = {
    homePage: HomePage;
};

export const test = base.extend<Fixtures>({
    homePage: async ({ page }, use) => await use(new HomePage(page)),
});
`;

