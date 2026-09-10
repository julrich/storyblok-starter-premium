import LandingpageComponent from "./LandingpageComponent";
import AboutComponent from "./AboutComponent";
import JobsComponent from "./JobsComponent";
import JobsDetailComponent from "./JobsDetailComponent";
import OverviewComponent from "./OverviewComponent";
import ShowcaseComponent from "./ShowcaseCompnent";

export default {
  title: "Page Archetypes",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const Landingpage = {
  render: LandingpageComponent,
};
export const About = {
  render: AboutComponent,
};
export const Jobs = {
  render: JobsComponent,
};
export const JobsDetail = {
  render: JobsDetailComponent,
};
export const Overview = {
  render: OverviewComponent,
};
export const Showcase = {
  render: ShowcaseComponent,
};
