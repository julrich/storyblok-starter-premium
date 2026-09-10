import { Header } from "../components/header/HeaderComponent";
import { headerProps } from "../components/header/Header.stories";
import { Footer } from "../components/footer/FooterComponent";
import { footerProps } from "../components/footer/Footer.stories";
import { Section } from "../components/section/SectionComponent";
import { Faq } from "../components/faq/FaqComponent";
import { TeaserCard } from "../components/teaser-card/TeaserCardComponent";
import { Testimonials } from "../components/testimonials/TestimonialsComponent";
import { Cta } from "../components/cta/CtaComponent";
import { ImageStory } from "../components/image-story/ImageStoryComponent";
import { ImageText } from "../components/image-text/ImageTextComponent";
import { Hero } from "../components/hero/HeroComponent";

const LandingPage = () => (
  <>
    <Header {...headerProps} floating />

    <Section width="full" spaceAfter="none" spaceBefore="none">
      <Hero
        buttons={[
          {
            icon: "arrow-down",
            label: "Explore further",
            url: "#startit",
          },
        ]}
        headline="Welcome to Our Dynamic Workplace"
        textbox
        textPosition="left"
        height="fullScreen"
        highlightText
        image={{
          indent: "none",
          src: "https://picsum.photos/seed/kdsvisual/640/270",
          srcDesktop:
            "img/colleagues-work-office-using-computers-looking-aside.png",
          srcMobile:
            "img/colleagues-work-office-using-computers-looking-aside.png",
          srcTablet:
            "img/colleagues-work-office-using-computers-looking-aside.png",
        }}
        sub="Where Creativity Meets Innovation"
        text="Experience the perfect blend of creativity, innovation, and productivity in our modern office environment."
      />
    </Section>
    <Section
      spotlight
      id="startit"
      headline={{
        text: "Design System Services",
        sub: "Crafting Consistency, Fostering Growth",
        switchOrder: true,
        width: "default",
        align: "center",
        textAlign: "center",
        large: true,
      }}
      width="wide"
    >
      <ImageStory
        layout="imageLeft"
        text={`
Here at Systemics, we bring a range of design system services that can make a difference:

### 1. Design System **Consulting**
Let's work side by side to shape a design system strategy that aligns perfectly with your goals. It's not just about tools; it's about guiding principles, stakeholder management und making the right decisions at the right time.

### 2. Design System **Creation & Development**
We'll bring your design system from concept to production, giving you consistent and engaging user experiences across different platforms. We will work together with your digital teams to transfer all complex Figma ideas into code using kickstartDS.

### 3. Headless **CMS & Websites**
We leverage the power of headless CMSs to provide scalable, flexible, and versatile websites that drive your online presence.

### 4. Design System **Training**
We empower your digital teams with the knowledge and skills to manage and evolve your design system effectively.

**Ready to make your digital journey exceptional?**`}
        image={{
          src: "/img/full-shot-different-people-working-together.png",
          alt: "Just a decorative illustration",
          vAlign: "top",
        }}
        buttons={[
          {
            label: "Reach out today!",
            icon: "chevron-right",
            url: "https://app.lemcal.com/@daniel-ley",
          },
        ]}
      />
    </Section>

    <Section
      style="framed"
      transition="to-accent"
      headline={{
        text: "No Agency site without some shiny happy Customer",
        sub: "AI-generated smiles, as you see them everywhere nowadays",
        textAlign: "left",
      }}
    >
      <Testimonials
        layout="slider"
        testimonial={[
          {
            image: {
              src: "/img/people/author-emily.png",
              alt: "Fake Testimonial Portrait",
            },
            name: "- Emily Johnson",
            quote:
              "Systemics's Design System transformed our development process. The consistency it introduced across our platforms not only saved us time but also boosted our brand's credibility. It's a partnership that continues to pay dividends.",
            title: "Director of Digital Strategy at EcoTech Solutions",
          },
          {
            image: {
              src: "/img/people/author-john.png",
              alt: "Fake Testimonial Portrait",
            },
            name: "- John Smith",
            quote:
              "Working with Systemics technology has been a game-changer for our brand. Their design system expertise brought harmony to our user experiences, making our digital platforms not just functional, but truly captivating.",
            title: "Chief Marketing Officer at TechFusion Enterprises",
          },
          {
            image: {
              src: "/img/people/author-alex.png",
              alt: "Fake Testimonial Portrait",
            },
            name: "- Alex Chen",
            quote:
              "As a startup, we needed to hit the ground running. Systemics's approach streamlined our dev and design process, allowing us to scale faster and focus on what truly matters - building a product that stands out in the market.",
            title: "CEO of LaunchPad Innovations",
          },
        ]}
      />
    </Section>

    <Section
      backgroundColor="accent"
      width="wide"
      headline={{
        text: "Happy Customers Showcases",
        sub: "We can create something shining for you too!",
      }}
    >
      <TeaserCard
        url="/showcase-techfusion_paid"
        headline="Transformation Love Story"
        text="See how we saved TechFusions a year's worth of development time"
        image="/img/showcases/comp_tfe01.jpg"
        button={{
          label: "View showcase",
          chevron: true,
        }}
      />
      <TeaserCard
        url="/showcase-launchpad_paid"
        headline="Speed and Scale"
        label="Freshest Fruit"
        text="Thanks to rapid landing page creation for LaunchPad Audio Innovations"
        image="/img/showcases/comp_audio01.jpg"
        button={{
          label: "View showcase",
          chevron: true,
        }}
      />
      <TeaserCard
        url="/showcase-eco_paid"
        headline="Saving Time and Money"
        text="Navigating the Headless Frontier for EcoTech's 'Brand Consistency"
        image="/img/showcases/comp_eco01.jpg"
        button={{
          label: "View showcase",
          chevron: true,
        }}
      />
    </Section>

    <Section width="wide">
      <Cta
        headline="Get in touch and chat with us about getting your product or platform to market faster"
        backgroundImage="/img/bg/bg_dot-carpet-blue.svg"
        image={{
          src: "/img/people/contact-person.png",
          padding: false,
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

    <Section
      headline={{
        text: "Design Systems, all you need to know",
        sub: "Why Design Systems have gained popularity in digital product development.",
        large: true,
        align: "left",
      }}
    >
      <Faq
        questions={[
          {
            question: "What is a Design System?",
            answer:
              "A Design System is a comprehensive set of guidelines, components, and tools that facilitate the consistent creation and maintenance of digital products. It serves as a single source of truth for designers, developers, and content creators, ensuring a cohesive brand identity and user experience across all platforms and devices.",
          },
          {
            question: "What are the benefits of investing in a Design System?",
            answer:
              "Investing in a Design System offers numerous benefits, including increased efficiency, improved collaboration, enhanced consistency, and streamlined workflows. It ensures a unified brand voice, facilitates faster product development, and enables teams to create scalable, maintainable, and adaptable digital experiences.",
          },
          {
            question:
              "How does it help enterprise companies with complex SaaS products?",
            answer:
              "We assist enterprise companies by creating tailored Design Systems that cater to the unique requirements of their complex SaaS products. Our approach involves understanding the product's goals, user needs, and brand identity, and then crafting a comprehensive Design System that streamlines workflows, enhances collaboration, and ensures a consistent user experience.",
          },
          {
            question: "Is a Design System not too expensive for a Startup?",
            answer:
              "While Design Systems may initially seem expensive, they are a long-term investment that can save startups time, resources, and money in the long run. By establishing a solid foundation for design and development, startups can reduce inconsistencies, minimize rework, and improve overall product quality, which ultimately leads to a more successful and sustainable business.",
          },
          {
            question: "How long does a Design System take to build?",
            answer:
              "The time required to build a Design System varies depending on the project's complexity, scope, and specific requirements. On average, a Design System can take anywhere from a few weeks to several months to develop. However, it is essential to remember that a Design System is an evolving entity that requires ongoing maintenance and updates.",
          },
          {
            question:
              "What's the difference between a Design System and a Style Guide?",
            answer:
              "A Style Guide is a subset of a Design System, focusing primarily on the visual aspects of a brand, such as colors, typography, and iconography. A Design System, on the other hand, is a more comprehensive framework that encompasses not only visual elements but also components, patterns, guidelines, and tools for design, development, and content creation.",
          },
          {
            question: "How much does a Design System cost?",
            answer:
              "The cost of a Design System varies depending on factors such as project scope, complexity, and specific requirements. It is essential to view a Design System as a long-term investment that yields significant returns in terms of improved efficiency, reduced rework, and enhanced brand consistency. If you start at zero and the design system should serve at least 5 digital touchpoints, it could take months to years to develop all the code base. We believe in tailored solutions, so get in touch with us to discuss your specific requirements. As we work with kickstartDS, you can save lots of money because all the main concepts and aspects are already covered. Invest in its paid modules is really low in comparison to the development time you normally need to spend. For the rest, we'll provide you with a transparent, customized quote that aligns with your goals.",
          },
        ]}
      />
    </Section>

    <Section width="wide" spaceBefore="none" spaceAfter="small">
      <ImageText
        image={{
          src: "/img/office-divider-image.png",
          alt: "Photorealistic image Super wide scale of a view into a hyper modern design & web development agency, glass walls, no people, wide angle, blade runner movie like aesthetics, neon-light, lens-flare, pink, blue, and cyan color tonality, wide angle, sharp, ",
        }}
        text={""}
        layout={"above"}
      />
    </Section>

    <Section
      headline={{
        text: "Headless CMS for the modern web",
        sub: "Frequently asked questions",
      }}
    >
      <Faq
        questions={[
          {
            question: "How do Headless CMSs fit into the picture?",
            answer:
              "A Headless CMS fits perfectly into the picture by offering a content-first approach that complements a Design System. It decouples the back-end content repository from the front-end presentation layer, allowing for seamless integration with any design system. The result is a flexible, scalable, and platform-agnostic system that ensures content consistency across all platforms and devices.",
          },
          {
            question:
              "How does the combination of Headless CMS and Design System create value?",
            answer:
              "The combination of a Headless CMS and a Design System creates value by enhancing efficiency, consistency, and scalability. A Headless CMS allows for seamless content management across various platforms, while a Design System ensures a consistent user experience and brand identity. Together, they enable teams to create and manage digital experiences more effectively, resulting in improved user engagement and business growth.",
          },
          {
            question: "Is transitioning to a Headless Web complicated?",
            answer:
              "Transitioning to a Headless Web can be a significant change, but it doesn't have to be complicated. With the right planning, tools, and expertise, the transition can be smooth and beneficial. It's about understanding your specific needs and goals, choosing the right Headless CMS, and effectively integrating it with your Design System.",
          },
          {
            question:
              "How can I ensure a consistent design across various channels with a Headless Web setup? ",
            answer:
              "Ensuring a consistent design across various channels with a Headless Web setup is achieved through the integration of a Design System. The Design System serves as a single source of truth for design elements and guidelines, ensuring a unified brand identity and user experience across all platforms and devices. Combined with the platform-agnostic nature of a Headless CMS, you can deliver a consistent and engaging user experience across all channels.",
          },
        ]}
      />
    </Section>

    <Section width="wide">
      <Cta
        highlightText
        textAlign="center"
        headline="Ready to embark on a transformative digital journey?"
        sub="Reach out to us for insights and solutions that seamlessly merge design systems and headless web architecture."
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
export default LandingPage;
