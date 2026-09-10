import { Header } from "../components/header/HeaderComponent";
import { headerProps } from "../components/header/Header.stories";
import { Footer } from "../components/footer/FooterComponent";
import { footerProps } from "../components/footer/Footer.stories";
import { Section } from "../components/section/SectionComponent";
import { Hero } from "../components/hero/HeroComponent";
import { Faq } from "../components/faq/FaqComponent";
import { Contact } from "../components/contact/ContactComponent";
import { Features } from "../components/features/FeaturesComponent";
import { Cta } from "../components/cta/CtaComponent";

const JobDetail = () => (
  <>
    <Header {...headerProps} />
    <Section width="full" spaceAfter="none" spaceBefore="none">
      <Hero
        headline="Frontend Developer (m/f/d)"
        sub="Shape the digital future with us at Systemics"
        text="Are you passionate about building outstanding web experiences? Join our agile team and help us deliver innovative solutions for leading brands."
        textPosition="left"
        invertText
        image={{
          srcMobile: "img/people-brainstorming-work-meeting.png",
          alt: "Team brainstorming in a meeting room",
        }}
        buttons={[
          {
            label: "Apply Now",
            url: "/apply",
          },
        ]}
      />
    </Section>

    <Section width="wide">
      <Cta
        headline="Become Part of Our Team"
        text={`Ready to take the next step in your career? As a Frontend Developer at Systemics, you’ll work on exciting projects, collaborate with talented colleagues, and help shape the digital future for leading brands. Apply now and start your journey with us!

As a Frontend Developer, you will be responsible for creating user-friendly web applications that are both functional and visually appealing. You will work closely with our design and backend teams to implement new features and improve existing ones.`}
        image={{
          src: "img/about/cta.png",
          alt: "Team brainstorming in a meeting room",
          padding: false,
        }}
      />
    </Section>

    <Section
      headline={{
        text: "Your Role",
        sub: "What you will do",
      }}
      width="wide"
    >
      <Features
        layout="largeTiles"
        ctas={{
          toggle: false,
        }}
        feature={[
          {
            icon: "arrow-right",
            title: "Modern Web Development",
            text: "Develop and maintain modern, responsive web applications using React and TypeScript",
          },
          {
            icon: "arrow-right",
            title: "Cross-Functional Collaboration",
            text: "Collaborate closely with UX/UI designers and backend developers",
          },
          {
            icon: "arrow-right",
            title: "Quality Assurance",
            text: "Ensure high code quality through code reviews and automated testing",
          },
          {
            icon: "arrow-right",
            title: "Performance Optimization",
            text: "Optimize applications for maximum speed and scalability",
          },
          {
            icon: "arrow-right",
            title: "Innovation & Improvement",
            text: "Contribute your ideas to improve our products and processes",
          },
        ]}
        style="besideSmall"
      />
    </Section>

    <Section
      headline={{
        text: "Your Profile",
        sub: "What we are looking for",
      }}
      width="wide"
    >
      <Features
        layout="largeTiles"
        ctas={{
          toggle: false,
        }}
        feature={[
          {
            icon: "arrow-right",
            title: "Frontend Expertise",
            text: "You have solid experience with React, TypeScript, and modern CSS frameworks.",
          },
          {
            icon: "arrow-right",
            title: "UI/UX Sensibility",
            text: "You care about great user experiences and have an eye for design details.",
          },
          {
            icon: "arrow-right",
            title: "Clean Code Mindset",
            text: "You write maintainable, well-documented code and value best practices.",
          },
          {
            icon: "arrow-right",
            title: "Team Player",
            text: "You enjoy collaborating in cross-functional teams and sharing your knowledge.",
          },
          {
            icon: "arrow-right",
            title: "Continuous Learner",
            text: "You stay up to date with new technologies and are eager to grow your skills.",
          },
          {
            icon: "arrow-right",
            title: "Fluent in English",
            text: "You communicate effectively in English, both written and spoken.",
          },
        ]}
        style="besideSmall"
      />
    </Section>

    <Section
      headline={{
        text: "Frequently Asked Questions",
        sub: "All about your application at Systemics",
      }}
    >
      <Faq
        questions={[
          {
            question: "Is this position remote?",
            answer:
              "Yes, you can work remotely from anywhere in Germany. We also have offices in several cities if you prefer working onsite.",
          },
          {
            question: "What does the application process look like?",
            answer:
              "After submitting your application, we’ll review your documents and invite you to a video interview if there’s a match. The final step is a technical challenge and a meeting with the team.",
          },
          {
            question: "Do I need to speak German?",
            answer:
              "No, English is our working language. German skills are a plus, but not required.",
          },
        ]}
      />
    </Section>

    <Section
      headline={{
        text: "Ready to join us?",
        sub: "We look forward to your application!",
      }}
    >
      <Contact
        image={{
          alt: "Picture of Jim Johnsson",
          aspectRatio: "wide",
          fullWidth: true,
          src: "img/people/contact-jim.png",
        }}
        links={[
          {
            ariaLabel: "Link to Jim Johnsson's email",
            icon: "email",
            label: "jim.johnsson@systemics.com",
            newTab: false,
            url: "mailto:jim.johnsson@systemics.com",
          },
          {
            icon: "phone",
            label: "+49 123 4567890",
            newTab: true,
            url: "tel:+491234567890",
          },
          {
            ariaLabel: "Link to Jim Johnsson's LinkedIn profile",
            icon: "linkedin",
            label: "LinkedIn",
            newTab: true,
            url: "https://www.linkedin.com/in/jimjohnsson/",
          },
        ]}
        copy="If you have any questions about the position or your application, feel free to reach out to our Head of Recruitment, Jim Johnsson."
        subtitle="Head of Recruitment"
        title="Jim Johnsson"
      />
    </Section>

    <Footer {...footerProps} />
  </>
);

export default JobDetail;
