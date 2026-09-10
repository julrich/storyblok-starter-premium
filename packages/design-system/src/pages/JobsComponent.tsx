import { Header } from "../components/header/HeaderComponent";
import { headerProps } from "../components/header/Header.stories";
import { Footer } from "../components/footer/FooterComponent";
import { footerProps } from "../components/footer/Footer.stories";
import { Section } from "../components/section/SectionComponent";
import { ImageText } from "../components/image-text/ImageTextComponent";
import { Hero } from "../components/hero/HeroComponent";
import { Stats } from "../components/stats/StatsComponent";
import { Testimonials } from "../components/testimonials/TestimonialsComponent";
import { TeaserCard } from "../components/teaser-card/TeaserCardComponent";
import { Faq } from "../components/faq/FaqComponent";
import { Contact } from "../components/contact/ContactComponent";
import { Features } from "../components/features/FeaturesComponent";

const Jobs = () => (
  <>
    <Header {...headerProps} />
    <Section width="full" spaceAfter="none" spaceBefore="none">
      <Hero
        headline="Welcome to Systemics"
        sub="Your partner in innovative software solutions"
        textPosition="corner"
        buttons={[
          {
            label: "Skip to Openings",
            url: "#openings",
            icon: "arrow-down",
          },
        ]}
        image={{
          srcMobile:
            "img/colleagues-work-office-using-computers-looking-aside.png",
        }}
      />
    </Section>
    <Section
      headline={{
        text: "Job Opportunities at Systemics",
        sub: "Explore our current job openings",
      }}
    >
      <ImageText
        text={`Join our team to build innovative software solutions. We are looking for passionate individuals to help us shape the future of technology.
Explore our current job openings and find the perfect fit for your skills and career goals.
Whether you are a seasoned professional or just starting your career, we have opportunities for you to grow and thrive in a dynamic work environment.
At Systemics, we value creativity, collaboration, and a commitment to excellence. Be part of a team that is dedicated to making a difference in the tech industry.`}
        image={{
          src: "img/people-brainstorming-work-meeting.png",
          alt: "Software Engineer",
        }}
        layout={"beside-right"}
      />
    </Section>
    <Section width="wide">
      <Testimonials
        layout="slider"
        quoteSigns="normal"
        testimonial={[
          {
            image: {
              alt: "Alt Text Customer 1",
              src: "img/people/author-emily.png",
            },
            name: "Emily Johnson",
            quote:
              "Working with Systemics technology has been a game-changer for our brand. Their design system expertise brought harmony to our user experiences, making our digital platforms not just functional, but truly captivating.",
            title: "Chief Marketing Officer at TechFusion Enterprises",
          },
          {
            image: {
              alt: "Alt Text Customer 2",
              src: "img/people/author-john.png",
            },
            name: "John Smith",
            quote:
              "Systemics's design system transformed our development process. The consistency it introduced across our platforms not only saved us time but also boosted our brand's credibility. It's a partnership that continues to pay dividends.",
            title: "Director of Digital Strategy at EcoTech Solutions",
          },
          {
            image: {
              alt: "Alt Text Customer 3",
              src: "img/people/author-alex.png",
            },
            name: "Alex Chen",
            quote:
              "As a startup, we needed to hit the ground running. Systemics's approach streamlined our dev and design process, allowing us to scale faster and focus on what truly matters - building a product that stands out in the market.",
            title: "CEO of LaunchPad Innovations",
          },
        ]}
      />
    </Section>
    <Section
      headline={{
        text: "Facts and Figures",
        sub: "Get to know Systemics by the numbers.",
        align: "center",
      }}
      width="wide"
    >
      <Stats
        stat={[
          {
            title: "Offices Worldwide",
            number: "5",
          },
          {
            title: "Employees in our Team",
            number: "150+",
          },
          {
            title: "Years in Business",
            number: "10+",
          },
          {
            title: "Projects Completed",
            number: "500+",
          },
        ]}
      />
    </Section>
    <Section
      id="openings"
      headline={{
        text: "Current Job Openings",
        sub: "Find the role that matches your skills and ambitions.",
      }}
      content={{
        mode: "list",
      }}
    >
      <TeaserCard
        layout="row"
        headline="Software Engineer"
        text="Join our team as a Software Engineer and help us build innovative solutions."
        url={"#"}
        button={{
          label: "See opening",
        }}
      />
      <TeaserCard
        layout="row"
        headline="Product Manager"
        text="We are looking for a Product Manager to drive our product strategy."
        url={"#"}
        button={{
          label: "See opening",
        }}
      />
      <TeaserCard
        layout="row"
        headline="UX Designer"
        text="Apply now for the UX Designer position and shape user experiences."
        url={"#"}
        button={{
          label: "See opening",
        }}
      />
      <TeaserCard
        layout="row"
        headline="Software Engineer"
        text="Join our team as a Software Engineer and help us build innovative solutions."
        url={"#"}
        button={{
          label: "See opening",
        }}
      />
      <TeaserCard
        layout="row"
        headline="Product Manager"
        text="We are looking for a Product Manager to drive our product strategy."
        url={"#"}
        button={{
          label: "See opening",
        }}
      />
    </Section>
    <Section
      width="wide"
      headline={{
        text: "Application Process",
        sub: "Your path to joining Systemics – step by step.",
      }}
      content={{
        mode: "slider",
        tileWidth: "full",
        gutter: "large",
      }}
    >
      <Hero
        textPosition="right"
        invertText
        textbox={false}
        overlay
        image={{
          srcMobile:
            "img/colleagues-work-office-using-computers-looking-aside.png",
          alt: "Application Process",
        }}
        headline="Discover Your Opportunity..."
        text="Browse our open positions and find the role that matches your skills and ambitions. We offer a variety of opportunities for professionals at every stage of their career."
      />
      <Hero
        textPosition="left"
        invertText
        textbox={false}
        overlay
        image={{
          srcMobile: "img/people-brainstorming-work-meeting.png",
          alt: "Application Process",
        }}
        headline="... Apply to Us ..."
        text="Prepare your resume and cover letter, then submit your application through our online portal. Make sure to highlight your experience and motivation for joining Systemics."
      />
      <Hero
        textPosition="left"
        invertText
        textbox={false}
        overlay
        image={{
          srcMobile:
            "img/colleagues-work-office-using-computers-looking-aside.png",
          alt: "Application Process",
        }}
        headline="... Ace the Interview ..."
        text="If your profile matches our requirements, we’ll invite you to an interview. This is your chance to get to know us and for us to learn more about you."
      />
      <Hero
        textPosition="right"
        invertText
        textbox={false}
        overlay
        image={{
          srcMobile: "img/people-brainstorming-work-meeting.png",
          alt: "Application Process",
        }}
        headline="and Join Our Team!"
        text="Congratulations! If you’re selected, we’ll send you an offer and guide you through the onboarding process."
      />
    </Section>
    <Section
      headline={{
        text: "Frequently Asked Questions",
        sub: "Everything you need to know about working and applying at Systemics.",
      }}
    >
      <Faq
        questions={[
          {
            question: "What is the application process?",
            answer:
              "To apply, please submit your resume and cover letter through our careers page. Our team will review your application and contact you if you are selected for an interview.",
          },
          {
            question: "What benefits do you offer?",
            answer:
              "We offer a comprehensive benefits package including health insurance, retirement plans, and professional development opportunities.",
          },
          {
            question: "How can I prepare for the interview?",
            answer:
              "Research our company, understand our products, and be ready to discuss your relevant experience and how it aligns with the role you are applying for.",
          },
          {
            question: "What is the company culture like?",
            answer:
              "Our company culture is collaborative, innovative, and focused on continuous improvement. We value diversity and inclusion and strive to create a supportive work environment.",
          },
          {
            question: "Are there opportunities for career growth?",
            answer:
              "Yes, we encourage career growth and provide various opportunities for professional development, including training programs, mentorship, and internal promotions.",
          },
        ]}
      />
    </Section>
    <Section
      headline={{
        text: "Our Benefits at a Glance",
        sub: "Working at Systemics comes with many advantages. These are just a few of them.",
      }}
    >
      <Features
        ctas={{
          toggle: false,
        }}
        feature={[
          {
            icon: "arrow-right",
            title: "Flexible Work Arrangements",
            text: "Enjoy the freedom to work remotely or from our modern offices. We support flexible schedules to help you balance your professional and personal life.",
          },
          {
            icon: "arrow-right",
            title: "Continuous Learning",
            text: "Benefit from ongoing training, workshops, and access to the latest technologies. We invest in your growth and professional development.",
          },
          {
            icon: "arrow-right",
            title: "Collaborative Culture",
            text: "Be part of a diverse and inclusive team where your ideas are valued. Collaboration and open communication are at the heart of our success.",
          },
          {
            icon: "arrow-right",
            title: "Attractive Compensation",
            text: "Receive a competitive salary and performance-based bonuses. We recognize and reward your contributions to our shared goals.",
          },
          {
            icon: "arrow-right",
            title: "Health & Wellbeing",
            text: "Take advantage of comprehensive health benefits, wellness programs, and regular team events to keep you healthy and motivated.",
          },
          {
            icon: "arrow-right",
            title: "Career Advancement",
            text: "Grow with us! We offer clear career paths, mentorship, and opportunities for internal promotions so you can achieve your ambitions.",
          },
        ]}
        layout="largeTiles"
        style="besideSmall"
      />
    </Section>
    <Section
      headline={{
        text: "Get in Touch",
        sub: "Contact our recruitment team for any questions about your application.",
      }}
    >
      <Contact
        image={{
          alt: "Picture of Isabella Doe",
          aspectRatio: "wide",
          fullWidth: true,
          src: "img/people/contact-jim.png",
        }}
        links={[
          {
            ariaLabel: "Link to Isabella Doe's social media profile",
            icon: "email",
            label: "jim.johnsson@mail.com",
            newTab: false,
            url: "mailto:mail@example.com",
          },
          {
            ariaLabel: "Link to Isabella Doe's social media profile",
            icon: "facebook",
            label: "@jim_johnsson",
            newTab: false,
            url: "#",
          },
        ]}
        copy="For any inquiries about job openings or the application process, feel free to reach out to our Head of Recruitment, Jim Johnsson."
        subtitle="Head of Recruitment"
        title="Jim Johnsson"
      />
    </Section>
    <Footer {...footerProps} />
  </>
);

export default Jobs
