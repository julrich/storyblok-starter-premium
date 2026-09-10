import { Header } from "../components/header/HeaderComponent";
import { headerProps } from "../components/header/Header.stories";
import { Footer } from "../components/footer/FooterComponent";
import { footerProps } from "../components/footer/Footer.stories";
import { Section } from "../components/section/SectionComponent";
import { Cta } from "../components/cta/CtaComponent";
import { ImageStory } from "../components/image-story/ImageStoryComponent";
import { ImageText } from "../components/image-text/ImageTextComponent";
import { Slider } from "../components/slider/SliderComponent";
import { TeaserCard } from "../components/teaser-card/TeaserCardComponent";
import { VideoCurtain } from "../components/video-curtain/VideoCurtainComponent";

const About = () => (
  <>
    <Header {...headerProps} floating />
    <Section
      inverted
      spaceBefore="none"
      spaceAfter="none"
      width="full"
      content={{
        mode: "list",
      }}
    >
      <VideoCurtain
        overlay
        highlightText
        textPosition="corner"
        headline="kickstartDS CMS Starter are here!"
        sub="Featuring a fully fledged, ready to use and easily themeable Design System"
        buttons={[
          {
            label: "Start here",
            url: "#starthere",
          },
        ]}
        video={{
          srcMobile: "img/videos/video-agency.mp4",
          srcTablet: "img/videos/video-agency.mp4",
          srcDesktop: "img/videos/video-agency.mp4",
        }}
      />
    </Section>

    <Section
      id="starthere"
      width="wide"
      headline={{
        text: "A Design System is nothing without a system applying it",
        sub: "Take off with our Starters 🚀",
        width: "default",
        align: "left",
        large: true,
      }}
      style="deko"
      content={{
        mode: "list",
        align: "left",
      }}
    >
      <Cta
        align="top"
        highlightText
        image={{ src: "/img/about/cta.png" }}
        text="
We bring you [CMS starter](/starter) to help setup your next professional website lighning fast. For the beginning you can choose between headless CMS backends like **Static CMS**, **Storyblok**, **Netlify Create** (formerly **Stackbit**) or you go with **11ty static site** generation.

**Dive into our demos, starter, components and discover the kickstartDS experience that suits you best!**"
        order={{ desktopImageLast: true }}
        buttons={[
          {
            icon: "chevron-right",
            label: "Go with a starter",
            url: "/starter",
          },
        ]}
      />
    </Section>

    <Section
      width="wide"
      headline={{
        text: "Highlights of the CMS Starter",
        sub: "Slide through our highlights",
        textAlign: "left",
      }}
    >
      <Slider autoplay equalHeight gap={15} arrows>
        <ImageText
          text={""}
          image={{
            src: "/static/img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
            alt: "A Slideshow - content of this slide: Connecting a Design System to a CMS has never been easier. And cheaper. Create your next digital experience faster, more consistent and sustainably than ever.",
          }}
          layout={"above"}
        />
        <ImageText
          image={{
            src: "/static/img/kickstartDS/CMS-Starter producthunt-slide-02.svg",
            alt: "A Slideshow - content of this slide: StaticCMS, Storyblok, Netlify Create (formerly Stackbit) and 11ty. Meet our Starters, low-code, open source, ready to start and batteries included",
          }}
          text={""}
          layout={"above"}
        />
        <ImageText
          image={{
            src: "/static/img/kickstartDS/CMS-Starter producthunt-slide-03.svg",
            alt: "A Slideshow - content of this slide: From zero to a deployed production website in less than 30 mins. For Storyblok, Stackbit (aka Netlify Create), StaticCMS or even as a static site with 11ty. Your choice!",
          }}
          text={""}
          layout={"above"}
        />
        <ImageText
          image={{
            src: "/static/img/kickstartDS/CMS-Starter producthunt-slide-05.svg",
            alt: "A Slideshow - content of this slide: Full Design System with branding layer included. Professional components, optimized for content & marketing websites to be used as a starting point for your very own Design System!",
          }}
          text={""}
          layout={"above"}
        />
        <ImageText
          image={{
            src: "/static/img/kickstartDS/CMS-Starter producthunt-slide-04.svg",
            alt: "A Slideshow - content of this slide: All component variants as presets in the CMS editor. Develop components once and reuse everywhere.",
          }}
          text={""}
          layout={"above"}
        />
        <ImageText
          image={{
            src: "/static/img/kickstartDS/CMS-Starter producthunt-slide-06.svg",
            alt: "A Slideshow - content of this slide: Automatic conversion with next-gen schema tooling! Use our transformers, or write your own one, based on an extensive library we wrote. Component screenshots, presets and configuration ... all automated!",
          }}
          text={""}
          layout={"above"}
        />
        <ImageText
          image={{
            src: "/static/img/kickstartDS/CMS-Starter producthunt-slide-07.svg",
            alt: "A Slideshow - content of this slide: Enter the world of headless CMS and start today. It's just one click away! We're on a mission to democratize Design Systems. Are you too?",
          }}
          text={""}
          layout={"above"}
        />
      </Slider>
    </Section>

    <Section
      width="wide"
      content={{
        mode: "list",
        width: "wide",
      }}
    >
      <ImageStory
        headline="Open Source vs. Premium Experience"
        layout="imageLeft"
        text={`
We built two distinct demo websites to represent the range of possibilities with kickstartDS. Plus, You'll find website starters, to start your journey even faster.

#### Basic Demo of an Agency Website
The Open Source Demo, built entirely on our [**open-source** modules](https://www.kickstartds.com/modules/), demonstrates the robust capabilities you can leverage at no cost. It highlights the immense value **kickstartDS** offers, without any investment.

#### Premium Experience Demo
For a more enhanced experience, check out the Premium Experience Demo. It demonstrates the potential of our [**premium** kickstartDS Content Component Module](https://www.kickstartds.com/content-module/). See how a modest and fair one time investment can significantly elevate the look and feel of your website or content-driven application, sustainably.
`}
        image={{
          src: "/img/full-shot-different-people-working-together.png",
          alt: "Digital art of two friendly girls standing in front of each other, playing with a huge pile of toy bricks in their center. the scene is surrounded by horizontal light stripes in motion creating a ring around them, light blue, violet and purple colors, light neon-lights, laser-light, wide-angle",
        }}
      />
    </Section>

    <Section width="wide">
      <Cta
        backgroundColor="var(--ks-background-color-bold)"
        padding
        headline="Spoiler Alert!"
        image={{
          src: "/static/img/about/spoiler.png",
          padding: true,
        }}
        highlightText
        text="Although this is just a website for demo purposes, if you are looking for an agency to serve your **headless** or **Design System** needs, contact us, we are real experts!"
        order={{
          desktopImageLast: true,
        }}
        buttons={[
          {
            label: "Contact us",
            url: "https://app.lemcal.com/@daniel-ley",
            icon: "person",
          },
        ]}
      />
    </Section>

    <Section
      backgroundColor="accent"
      width="wide"
      headline={{
        width: "default",
        align: "left",
        text: "Comparing both demos, you can **gain** a clear understanding of the **value** proposition offered by **kickstartDS**",
        sub: "From Open Source solution to premium marketing experience",
        switchOrder: true,
      }}
    >
      <TeaserCard
        headline="Basic Agency Website Demo"
        text="Compare what the free version, using Open Source components only, can already offer"
        url={"https://basic.design-system.agency/"}
        button={{
          label: "Browse basic Demo",
        }}
      />
      <TeaserCard
        headline="Premium Content Experience"
        text="Which is enriched with more complex components, based on the kickstartDS Content Module."
        url={"https://design-system.agency/"}
        button={{
          label: "Browse premium Demo",
        }}
      />
      <TeaserCard
        headline="65+ Examples build on top of 18 components"
        text="Flick through our component collection, switching themes or toggling inverted styles"
        url={"/components"}
        button={{
          label: "Browse all Components",
        }}
      />
      <TeaserCard
        headline="Check out the Storybook"
        text="Browsing our Storybook will allow a look behind the scenes on what the kickstartDS Design System starter has to offer"
        url={"https://main--64f08cbba622af835d382b4f.chromatic.com/"}
        button={{
          label: "Explore Storybook",
        }}
      />
    </Section>

    <Section
      spaceBefore="none"
      transition="to-inverted"
      style="framed"
      width="wide"
    >
      <ImageText
        image={{
          src: "/img/about/purpose.png",
        }}
        text={`
### The purpose of this demo
This demo is intended to provide a firsthand experience of the capabilities of [**kickstartDS**](https://www.kickstartds.com). It's not just a website; it's a demonstration of how we can transform your digital landscape. Please note that while this demo represents a **Design System Agency**, the principles and techniques showcased are applicable to a wide range of industries and use cases.
        `}
        layout={"above"}
      />
      <ImageText
        text={`
### Important disclaimer
While we've strived to provide a comprehensive demonstration, please bear in mind that this is a simplified showcase of the potential of [**kickstartDS**](https://www.kickstartds.com). The actual implementation of a **Design System** and **headless CMS** like **Storyblok** or **Netlify Create** can be tailored to your specific needs and goals, ensuring a custom solution that drives your digital success.
        `}
        image={{
          src: "/img/about/disclaimer.png",
          alt: "",
        }}
        layout={"above"}
      />
    </Section>

    <Section inverted width="wide">
      <Cta
        headline="Want to know more?"
        sub="Intrigued by what a kickstartDS-driven website can do for your brand?"
        text="Let's explore how we can shape your digital journey. Get in touch today!"
        order={{
          desktopImageLast: false,
        }}
        image={{
          src: "img/about/cutout.png",
        }}
        buttons={[
          {
            label: "Contact us",
            url: "https://app.lemcal.com/@daniel-ley",
            icon: "person",
          },
          {
            label: "Book a meeting",
            url: "https://app.lemcal.com/@daniel-ley",
            icon: "date",
          },
        ]}
      />
    </Section>

    <Footer {...footerProps} />
  </>
);

export default About
