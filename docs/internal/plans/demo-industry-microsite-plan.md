# Demo Micro-Site Plan: FALKENBERG Precision GmbH

## Purpose

This document defines the concept, content structure, and page-by-page generation plan for a **fictional industrial manufacturing company** micro-site. The site serves as a showcase for the **ruhmesmeile CMS Website-Accelerator** targeted at German industrial customers ("Fertigungs- / Industrieunternehmen").

All pages will be created under the Storyblok slug/folder **`industry`** using the MCP server's `plan_page` → `generate_section` → `create_page_with_content` workflow.

---

## Company Profile: FALKENBERG Precision GmbH

### Identity

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| **Name**         | FALKENBERG Precision GmbH                  |
| **Founded**      | 1983                                       |
| **Headquarters** | Stuttgart, Germany                         |
| **Employees**    | ~420                                       |
| **Revenue**      | €78M (2025)                                |
| **Industry**     | Industrial Sensors & Precision Measurement |
| **Tagline**      | "Precision That Drives Industry Forward"   |
| **Website Slug** | `industry`                                 |

### Company Story

FALKENBERG Precision was founded in 1983 by Klaus Falkenberg, a mechanical engineer who left a large sensor manufacturer to develop his own line of high-precision measurement instruments. Starting in a small workshop in Stuttgart-Vaihingen, the company grew through relentless focus on accuracy and reliability.

Today, FALKENBERG is a recognized name in industrial metrology and sensor technology. The company develops, manufactures, and distributes precision sensors, measurement systems, and quality inspection solutions for industries ranging from automotive to aerospace, pharmaceuticals to energy.

As a classic German Mittelstand company, FALKENBERG combines engineering excellence with a family-business culture, now led by second-generation CEO Dr. Lena Falkenberg. The company operates manufacturing facilities in Stuttgart and Tübingen, with sales offices in Munich, Hamburg, and international representatives in 30+ countries.

### Core Values

- **Precision** — Accuracy down to the micron, in products and processes
- **Reliability** — Trusted by the world's most demanding industries for 40+ years
- **Innovation** — Continuous R&D investment (12% of revenue) driving Industry 4.0 solutions
- **Partnership** — Long-term customer relationships, not just transactions

### Product Portfolio

| Category                    | Description                                                                             | Key Industries          |
| --------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| **Precision Sensors**       | High-accuracy inductive, capacitive, and optical sensors for automated production lines | Automotive, Electronics |
| **Measurement Systems**     | Complete measurement and inspection systems for quality control and process monitoring  | Aerospace, Pharma       |
| **Industrial IoT Gateways** | Smart sensor hubs connecting legacy equipment to modern data platforms (Industry 4.0)   | All industries          |
| **Calibration Services**    | ISO 17025-accredited calibration laboratory for sensors and measurement instruments     | All industries          |

### Key Differentiators

1. **German Engineering, Global Reach** — Designed and manufactured in Baden-Württemberg, deployed in 30+ countries
2. **Industry 4.0 Pioneer** — One of the first sensor manufacturers to offer IoT-ready products with open API interfaces
3. **Full-Stack Metrology** — From single sensors to complete measurement systems, including calibration services
4. **Extreme Precision** — Measurement accuracy down to ±0.1 µm in optical systems
5. **Long Lifecycle Support** — 15+ year product support commitment, critical for industrial customers

### Target Customers

- Production managers and quality engineers at manufacturing plants
- C-level executives evaluating digital transformation / Industry 4.0 investments
- OEM integration partners building measurement into their machines
- Research & development labs in universities and research institutions

---

## Micro-Site Architecture

### Page Overview

| #   | Page                  | Slug                 | Template Type       | Purpose                                               |
| --- | --------------------- | -------------------- | ------------------- | ----------------------------------------------------- |
| 1   | **Homepage**          | `industry`           | Trust-Heavy Landing | Company introduction, key capabilities, trust signals |
| 2   | **Products**          | `industry/products`  | Product Landing     | Product portfolio overview with category teasers      |
| 3   | **Solutions**         | `industry/solutions` | Service Detail      | Industry-specific application stories                 |
| 4   | **About Us**          | `industry/about`     | Company About       | Company history, values, team, facilities             |
| 5   | **Service & Support** | `industry/service`   | Service Detail      | Calibration, training, technical support, spare parts |
| 6   | **Contact**           | `industry/contact`   | Minimal + Contact   | Contact form, office locations, sales representatives |

### Navigation Structure

```
FALKENBERG Precision
├── Products
├── Solutions
├── About Us
├── Service & Support
└── Contact
```

---

## Page-by-Page Content Plan

Each page plan includes: the page intent (for `plan_page`), the recommended section sequence, and detailed content briefs per section (for `generate_section` prompts). The section sequences are based on the established patterns from `analyze_content_patterns` and curated recipes from `list_recipes`.

### Conventions

- **Icons** — Only use valid identifiers from `list_icons`: `arrow-right`, `star`, `email`, `phone`, `map-pin`, `download`, `search`, `home`, `person`, `date`, `time`, `file`, `login`, `upload`, `map`
- **Buttons** — Hero: 1–2 buttons; CTA: 1–2 buttons; as per site median
- **Features** — 3–4 items per features section (site median: 6, but 3–4 per recipe recommendation)
- **Stats** — 3–4 stat items per section
- **Testimonials** — 2–3 per section
- **FAQ** — 5–8 questions per section
- **Images** — All external images require `uploadAssets: true` when creating pages
- **Asset Folder** — Use `assetFolderName: "FALKENBERG Precision"` for all pages
- **Path** — Use `path: "industry"` for the homepage, and `path: "industry/{slug}"` for subpages

---

### Page 1: Homepage

**Slug:** `industry`
**Intent:** "Corporate homepage for a German precision sensor manufacturer. Establish credibility, showcase product range, highlight Industry 4.0 capabilities, and convert visitors to contact or product exploration."

**Section Sequence:**

| #   | Component      | Section Role           |
| --- | -------------- | ---------------------- |
| 1   | `hero`         | Brand introduction     |
| 2   | `features`     | Key capabilities       |
| 3   | `stats`        | Company achievements   |
| 4   | `split-even`   | Industry 4.0 spotlight |
| 5   | `testimonials` | Customer validation    |
| 6   | `logos`        | Client logo wall       |
| 7   | `cta`          | Primary conversion     |

**Section Content Briefs:**

#### 1. Hero

- **Headline:** "Precision That Drives Industry Forward"
- **Sub-headline:** "High-performance sensors and measurement systems for the world's most demanding manufacturing environments. Engineered in Germany since 1983."
- **Image:** Industrial facility interior with precision measurement equipment, clean and modern aesthetic
- **Buttons:** "Explore Products" (primary, links to /industry/products), "Request a Consultation" (secondary, links to /industry/contact)
- **Note:** Set `hero.buttons` count to 2

#### 2. Features — Core Capabilities

- **Section headline:** "Engineering Excellence Across Every Product Line"
- **4 Feature items:**
  1. **Precision Sensors** — "Inductive, capacitive, and optical sensors with accuracy down to ±0.1 µm" — Icon: `star`
  2. **Measurement Systems** — "Complete quality inspection solutions for automated production" — Icon: `search`
  3. **Industrial IoT** — "Smart gateways connecting your machines to modern data platforms" — Icon: `upload`
  4. **Calibration Services** — "ISO 17025-accredited laboratory ensuring traceable accuracy" — Icon: `file`

#### 3. Stats — Company in Numbers

- **4 Stat items:**
  1. "40+" — "Years of Precision Engineering"
  2. "30+" — "Countries Served Worldwide"
  3. "±0.1 µm" — "Measurement Accuracy"
  4. "15+" — "Years Product Lifecycle Support"

#### 4. Split-Even — Industry 4.0 Spotlight

- **Headline:** "Industry 4.0 Ready: From Sensor to Cloud"
- **Text:** "Our Industrial IoT Gateways bridge the gap between legacy equipment and modern data platforms. Connect any sensor — ours or third-party — to your MES, ERP, or cloud analytics in minutes, not months. Open APIs, edge computing, and OPC UA support built in."
- **Image:** Visualization of sensor data flowing from factory floor to cloud dashboard
- **Button:** "Learn More About Our IoT Solutions" → /industry/solutions

#### 5. Testimonials — Customer Voices

- **2–3 testimonials:**
  1. **Dr. Stefan Müller**, Head of Quality, Automotive Tier-1 Supplier — "FALKENBERG sensors have been the backbone of our inline quality inspection for over 15 years. Their accuracy and long-term stability are unmatched."
  2. **Ing. Maria Rossi**, Production Director, Italian Aerospace Manufacturer — "When we needed to digitize our legacy measurement equipment, FALKENBERG's IoT gateway was the only solution that integrated seamlessly with our existing infrastructure."
  3. **Prof. Thomas Weber**, Technical University of Munich — "For our research lab, we rely on FALKENBERG calibration services. Their ISO 17025 accreditation and fast turnaround make them our preferred partner."

#### 6. Logos — Trusted By Industry Leaders

- **8 logos** (fictional company logos / placeholder text): "Leading automotive OEMs, aerospace manufacturers, pharmaceutical companies, and research institutions trust FALKENBERG precision."
- **Note:** Since these are fictional, use placeholder descriptive text. When creating in Storyblok, images can be added later.

#### 7. CTA — Contact Conversion

- **Headline:** "Ready to Elevate Your Measurement Precision?"
- **Text:** "Whether you're upgrading existing systems or planning a new production line, our engineering team is ready to help you find the optimal sensor and measurement solution."
- **Buttons:** "Get in Touch" (primary, → /industry/contact), "Download Product Catalog" (secondary)

---

### Page 2: Products

**Slug:** `industry/products`
**Intent:** "Product portfolio overview for a precision sensor manufacturer. Present four main product categories with enough detail to drive exploration, while building confidence in the breadth and depth of the product range."

**Section Sequence:**

| #   | Component    | Section Role                             |
| --- | ------------ | ---------------------------------------- |
| 1   | `hero`       | Products page opener                     |
| 2   | `features`   | Product range overview                   |
| 3   | `split-even` | Featured product deep-dive (Sensors)     |
| 4   | `split-even` | Featured product deep-dive (IoT Gateway) |
| 5   | `stats`      | Product performance data                 |
| 6   | `faq`        | Technical questions                      |
| 7   | `cta`        | Request quote / catalog                  |

**Section Content Briefs:**

#### 1. Hero

- **Headline:** "Precision Products for Every Measurement Challenge"
- **Sub-headline:** "From single sensors to complete measurement systems — engineered for maximum accuracy, reliability, and ease of integration."
- **Image:** Array of precision sensors and measurement instruments on a clean white surface
- **Buttons:** "Request a Quote" (primary, → /industry/contact)

#### 2. Features — Product Categories

- **Section headline:** "Our Product Portfolio"
- **4 Feature items:**
  1. **Precision Sensors** — "High-accuracy inductive, capacitive, and optical sensors for automated production. Ranges from sub-micron to meters." — Icon: `star`
  2. **Measurement Systems** — "Turnkey inspection solutions: sensor arrays, controllers, software, and integration. Inline and offline." — Icon: `search`
  3. **Industrial IoT Gateways** — "Connect any sensor to any platform. OPC UA, MQTT, REST APIs. Edge computing built-in." — Icon: `upload`
  4. **Calibration Equipment** — "Reference standards and portable calibration tools for in-house metrology labs." — Icon: `file`

#### 3. Split-Even — Precision Sensors Deep-Dive

- **Headline:** "Precision Sensors: Accuracy Down to ±0.1 µm"
- **Text:** "Our flagship sensor line covers inductive displacement sensors (eddy current), capacitive gap sensors, optical triangulation sensors, and confocal chromatic sensors. Each product line is optimized for specific measurement tasks — from nanometer-resolution surface profiling to millimeter-range displacement monitoring in harsh industrial environments. All sensors feature EMC-hardened electronics, IP67/IP69K housings, and operating temperatures from -40°C to +120°C."
- **Image:** Close-up of a precision optical sensor mounted on a measurement rig
- **Button:** "View Sensor Catalog" → (external link placeholder)

#### 4. Split-Even — IoT Gateway Deep-Dive

- **Headline:** "FalkenConnect IoT Gateway: Your Bridge to Industry 4.0"
- **Text:** "The FalkenConnect IIoT Gateway transforms any sensor installation into a smart data source. Plug in up to 64 analog and digital sensors, configure data processing on the edge, and stream results to your MES, cloud platform, or data lake. Supports OPC UA, MQTT, REST, and Modbus protocols. Includes a web-based configuration UI — no programming required."
- **Image:** IoT gateway device with sensor cables connected, dashboard visible on a tablet
- **Button:** "Explore FalkenConnect" → /industry/solutions

#### 5. Stats — Performance Numbers

- **4 Stat items:**
  1. "±0.1 µm" — "Best-in-Class Sensor Accuracy"
  2. "64" — "Sensor Channels per IoT Gateway"
  3. "IP69K" — "Maximum Protection Rating"
  4. "-40° to +120°C" — "Operating Temperature Range"

#### 6. FAQ — Technical Questions

- **6 Questions:**
  1. "What sensor technology is best for my application?" — "The optimal choice depends on your target material, measurement range, accuracy requirements, and environmental conditions. Our inductive sensors excel on metallic targets, capacitive sensors on any conductive material, and optical sensors provide non-contact measurement on virtually any surface. Contact our application engineers for a free recommendation."
  2. "Can FALKENBERG sensors integrate with our existing PLC/controller?" — "Yes. All our sensors provide industry-standard analog outputs (0–10V, 4–20mA) and digital interfaces (IO-Link, EtherCAT, PROFINET). The FalkenConnect gateway adds MQTT, OPC UA, and REST API connectivity for modern platforms."
  3. "What is the typical lead time for standard products?" — "Standard catalog products ship within 5–10 business days from our Stuttgart warehouse. Custom configurations require 4–8 weeks depending on complexity."
  4. "Do you offer on-site installation and commissioning?" — "Yes. Our field service engineers are available worldwide for installation, commissioning, and training. We also offer remote commissioning support via secure video link."
  5. "How often should sensors be recalibrated?" — "We recommend annual recalibration for most applications, or every 6 months in high-precision or regulated environments. Our ISO 17025 calibration lab provides fast turnaround with traceable certificates."
  6. "What warranty do you provide?" — "All FALKENBERG products come with a standard 3-year warranty. Extended warranty and lifecycle support contracts of up to 15 years are available."

#### 7. CTA

- **Headline:** "Find the Right Measurement Solution"
- **Text:** "Our application engineers will help you select the optimal sensor or system for your specific measurement challenge."
- **Buttons:** "Request a Quote" (primary, → /industry/contact), "Download Product Catalog" (secondary)

---

### Page 3: Solutions

**Slug:** `industry/solutions`
**Intent:** "Industry-specific solutions page showcasing how FALKENBERG products solve real-world measurement challenges across automotive, aerospace, pharma, and energy sectors. Focus on use cases and business outcomes, not just product specs."

**Section Sequence:**

| #   | Component      | Section Role             |
| --- | -------------- | ------------------------ |
| 1   | `hero`         | Solutions page opener    |
| 2   | `features`     | Industry overview        |
| 3   | `split-even`   | Automotive use case      |
| 4   | `split-even`   | Aerospace use case       |
| 5   | `split-even`   | Pharma use case          |
| 6   | `testimonials` | Customer success stories |
| 7   | `cta`          | Consultation booking     |

**Section Content Briefs:**

#### 1. Hero

- **Headline:** "Measurement Solutions for Every Industry"
- **Sub-headline:** "From automotive inline inspection to pharmaceutical compliance monitoring — we solve the most demanding measurement challenges across manufacturing sectors worldwide."
- **Image:** Collage or wide-angle shot of various industrial environments: car body measurement, cleanroom, turbine inspection
- **Buttons:** "Talk to Our Engineers" (primary, → /industry/contact)

#### 2. Features — Industry Verticals

- **Section headline:** "Industries We Serve"
- **4 Feature items:**
  1. **Automotive** — "Inline body-in-white measurement, gap & flush inspection, powertrain quality control" — Icon: `star`
  2. **Aerospace** — "Turbine blade profiling, composite thickness measurement, non-destructive testing integration" — Icon: `search`
  3. **Pharmaceuticals** — "Fill level monitoring, vial inspection, cleanroom-compatible sensors with FDA 21 CFR Part 11 support" — Icon: `file`
  4. **Energy** — "Wind turbine bearing monitoring, solar panel flatness inspection, battery cell quality control" — Icon: `upload`

#### 3. Split-Even — Automotive Use Case

- **Headline:** "Automotive: 100% Inline Inspection at Line Speed"
- **Text:** "A leading European automotive OEM integrated 128 FALKENBERG optical sensors into their body-in-white welding line, enabling 100% gap and flush measurement at full production speed. The result: scrap reduction of 34%, warranty claims down by 22%, and complete digital traceability of every vehicle body produced. The FalkenConnect gateway streams all measurement data to the plant's MES in real time."
- **Image:** Automotive production line with sensor equipment measuring a car body
- **Button:** "Explore Automotive Solutions"

#### 4. Split-Even — Aerospace Use Case

- **Headline:** "Aerospace: Micron-Level Precision for Turbine Blades"
- **Text:** "A major turbine manufacturer uses FALKENBERG confocal chromatic sensors for 100% surface profiling of high-pressure turbine blades. With ±0.25 µm accuracy and non-contact measurement, the system inspects critical airfoil geometry without risk of surface damage. Integrated into a 5-axis robotic cell, the solution measures a complete blade in under 90 seconds."
- **Image:** Close-up of a turbine blade being measured by an optical sensor system
- **Button:** "Explore Aerospace Solutions"

#### 5. Split-Even — Pharmaceuticals Use Case

- **Headline:** "Pharma: Reliable Measurement in Regulated Environments"
- **Text:** "A global pharmaceutical company deployed FALKENBERG capacitive sensors for fill-level monitoring on their vial filling lines. The cleanroom-compatible sensors with FDA 21 CFR Part 11 data integrity ensure every single vial is filled to specification. Automated calibration verification runs every 4 hours, with all results logged for regulatory audit trails."
- **Image:** Cleanroom pharmaceutical production line with sensor instrumentation
- **Button:** "Explore Pharma Solutions"

#### 6. Testimonials

- **2 testimonials:**
  1. **Klaus Richter**, VP Manufacturing, European Automotive OEM — "Implementing FALKENBERG's inline measurement system was the single biggest quality improvement in our body shop in the last decade. The ROI was achieved in under 8 months."
  2. **Dr. Yuki Tanaka**, Quality Director, Aerospace Manufacturer — "FALKENBERG's combination of sensor precision and IoT connectivity gives us the real-time quality data we need for our zero-defect manufacturing strategy."

#### 7. CTA

- **Headline:** "Let's Solve Your Measurement Challenge"
- **Text:** "Every manufacturing process is unique. Our application engineers combine deep industry knowledge with 40+ years of sensor expertise to design the optimal solution for your specific requirements."
- **Buttons:** "Schedule a Consultation" (primary, → /industry/contact), "View All Products" (secondary, → /industry/products)

---

### Page 4: About Us

**Slug:** `industry/about`
**Intent:** "Company about page for a family-owned German Mittelstand manufacturer. Tell the 40-year story from workshop to global player, introduce the leadership, showcase facilities, and reinforce the company's values of precision, reliability, and innovation."

**Section Sequence:**

| #   | Component      | Section Role              |
| --- | -------------- | ------------------------- |
| 1   | `hero`         | Company story opener      |
| 2   | `split-even`   | Company history & mission |
| 3   | `features`     | Core values               |
| 4   | `stats`        | Company facts             |
| 5   | `split-even`   | Leadership / R&D focus    |
| 6   | `testimonials` | Employee perspectives     |
| 7   | `cta`          | Careers / Contact         |

**Section Content Briefs:**

#### 1. Hero

- **Headline:** "Engineering Precision Since 1983"
- **Sub-headline:** "From a small workshop in Stuttgart to a global leader in industrial measurement technology — driven by a relentless pursuit of accuracy and a commitment to our customers' success."
- **Image:** Aerial or wide-angle shot of the FALKENBERG headquarters campus in Stuttgart
- **Buttons:** "Our History" (primary), "Join Our Team" (secondary)

#### 2. Split-Even — Company History & Mission

- **Headline:** "From Workshop to World Stage"
- **Text:** "In 1983, mechanical engineer Klaus Falkenberg left his position at a major sensor company with a vision: to build the most accurate industrial sensors in the world. Working from a converted garage in Stuttgart-Vaihingen, he developed the FP-100 — an inductive displacement sensor that achieved 10x better accuracy than the competition. Word spread quickly through Germany's automotive industry, and by 1990, FALKENBERG sensors were standard equipment in quality labs across the country. Today, under the leadership of Dr. Lena Falkenberg, the company has grown to 420 employees, two production sites, and customers in over 30 countries — while preserving the founder's obsession with precision."
- **Image:** Split image: historic workshop photo (1983) alongside modern production facility

#### 3. Features — Core Values

- **Section headline:** "What Drives Us"
- **4 Feature items:**
  1. **Precision** — "Accuracy is not a feature — it's our foundation. Every product we make pushes the limits of what's measurable." — Icon: `star`
  2. **Reliability** — "Our sensors run 24/7 in the world's most demanding environments. They have to work, every single time." — Icon: `file`
  3. **Innovation** — "12% of revenue invested in R&D, every year. Over 180 patents. New products driven by real customer needs." — Icon: `search`
  4. **Partnership** — "We don't just sell sensors. We solve measurement problems — together with our customers, for the long term." — Icon: `person`

#### 4. Stats — Company in Numbers

- **4 Stat items:**
  1. "420" — "Employees Worldwide"
  2. "12%" — "Revenue Invested in R&D"
  3. "180+" — "Active Patents"
  4. "€78M" — "Annual Revenue (2025)"

#### 5. Split-Even — Leadership & R&D

- **Headline:** "Led by Engineering, Driven by Innovation"
- **Text:** "Dr. Lena Falkenberg, CEO since 2015, holds a PhD in Optical Engineering from KIT (Karlsruhe Institute of Technology). Under her leadership, FALKENBERG has doubled its R&D investment, launched the FalkenConnect IoT platform, and expanded into confocal chromatic sensor technology — opening entirely new application fields in aerospace and medical device manufacturing. With 85 engineers in the R&D department and a state-of-the-art application laboratory, we develop tomorrow's measurement solutions in close collaboration with our customers and leading research institutions."
- **Image:** Modern R&D lab with engineers working on sensor prototypes

#### 6. Testimonials — Employee Perspectives

- **2 testimonials:**
  1. **Michael Braun**, Senior Sensor Engineer (18 years at FALKENBERG) — "What keeps me here is the combination of cutting-edge technology with a family atmosphere. We work on real engineering challenges that make a difference in factories around the world."
  2. **Dr. Aisha Patel**, Head of IoT Development (5 years at FALKENBERG) — "When I joined from a large tech company, I was amazed by the depth of domain expertise. At FALKENBERG, every software feature starts with understanding the physics of measurement."

#### 7. CTA

- **Headline:** "Write the Next Chapter With Us"
- **Text:** "We're always looking for talented engineers, scientists, and business professionals who share our passion for precision."
- **Buttons:** "View Open Positions" (primary), "Contact Us" (secondary, → /industry/contact)

---

### Page 5: Service & Support

**Slug:** `industry/service`
**Intent:** "Service and support page for a precision measurement company. Showcase calibration services, technical support, training programs, and spare parts availability. Address the full lifecycle of measurement equipment and build confidence in long-term partnership."

**Section Sequence:**

| #   | Component    | Section Role              |
| --- | ------------ | ------------------------- |
| 1   | `hero`       | Service page opener       |
| 2   | `features`   | Service portfolio         |
| 3   | `split-even` | Calibration lab spotlight |
| 4   | `split-even` | Training programs         |
| 5   | `faq`        | Service questions         |
| 6   | `cta`        | Service request           |

**Section Content Briefs:**

#### 1. Hero

- **Headline:** "Supporting Your Precision — For the Entire Product Lifecycle"
- **Sub-headline:** "From installation and commissioning to calibration, training, and spare parts — FALKENBERG Service keeps your measurement systems running at peak performance."
- **Image:** Service engineer performing on-site calibration of a measurement system
- **Buttons:** "Request Service" (primary, → /industry/contact)

#### 2. Features — Service Portfolio

- **Section headline:** "Our Service Offerings"
- **4 Feature items:**
  1. **Calibration Services** — "ISO 17025-accredited laboratory. DAkkS-traceable calibration of all sensor types. Express service available." — Icon: `star`
  2. **Technical Support** — "Direct access to our application engineers. Phone, email, and remote diagnostics. Response within 4 hours." — Icon: `phone`
  3. **Training & Education** — "On-site and virtual training courses for sensor technology, measurement strategy, and FalkenConnect IoT setup." — Icon: `person`
  4. **Spare Parts & Repair** — "Genuine spare parts available for 15+ years. Factory repair with performance guarantee." — Icon: `download`

#### 3. Split-Even — Calibration Lab

- **Headline:** "ISO 17025 Calibration Laboratory"
- **Text:** "Our state-of-the-art calibration laboratory in Stuttgart is accredited by DAkkS (Deutsche Akkreditierungsstelle) to ISO/IEC 17025. We calibrate all major sensor types — inductive, capacitive, optical, and confocal — against national and international reference standards. Standard turnaround is 5 business days, with express service (24–48 hours) available for critical needs. Every calibration includes a comprehensive certificate with measurement uncertainty statements."
- **Image:** Interior of a clean, temperature-controlled calibration laboratory with reference equipment
- **Button:** "Request Calibration" → /industry/contact

#### 4. Split-Even — Training Programs

- **Headline:** "Training That Empowers Your Team"
- **Text:** "Our training programs are designed for measurement technicians, quality engineers, and production managers. Choose from standardized courses — 'Fundamentals of Industrial Sensing', 'Advanced Measurement Strategy', 'FalkenConnect IoT Administration' — or request a customized program tailored to your specific equipment and applications. All courses combine theory with hands-on practice using real sensor equipment, and are available on-site at your facility or at our Stuttgart training center."
- **Image:** Classroom/workshop setting with participants and sensor equipment
- **Button:** "Browse Training Courses"

#### 5. FAQ — Service Questions

- **6 Questions:**
  1. "How do I request a calibration?" — "Contact our service team via phone, email, or the online form. We'll provide a quote and shipping instructions. For large sensor quantities, we offer on-site calibration at your facility."
  2. "What is your calibration turnaround time?" — "Standard turnaround is 5 business days from receipt. Express service (24–48 hours) is available for an additional fee. We also offer scheduled annual calibration contracts with guaranteed turnaround."
  3. "Do you calibrate third-party sensors?" — "Yes, we calibrate sensors from all major manufacturers. Our accredited lab can calibrate any inductive, capacitive, or optical displacement sensor regardless of brand."
  4. "Is remote technical support available?" — "Yes. Our application engineers provide support via phone, email, and secure video link. For complex issues, we can remotely access your FalkenConnect gateway (with your permission) to diagnose problems in real time."
  5. "Can training be customized for our specific setup?" — "Absolutely. We regularly develop tailored training programs based on your specific sensor types, applications, and skill levels. Contact us with your requirements for a custom training proposal."
  6. "How long are spare parts available?" — "We guarantee spare part availability for a minimum of 15 years from product launch. Many legacy products are supported even longer. This is our commitment to your investment protection."

#### 6. CTA

- **Headline:** "Keep Your Measurement Systems at Peak Performance"
- **Text:** "Contact our service team to schedule a calibration, book a training session, or discuss a long-term support contract."
- **Buttons:** "Contact Service Team" (primary, → /industry/contact), "Download Service Brochure" (secondary)

---

### Page 6: Contact

**Slug:** `industry/contact`
**Intent:** "Contact page for a German industrial manufacturer. Provide clear contact options (form, phone, email), list office locations, and make it easy for potential customers and existing clients to reach the right department."

**Section Sequence:**

| #   | Component  | Section Role          |
| --- | ---------- | --------------------- |
| 1   | `hero`     | Contact page opener   |
| 2   | `features` | Contact channels      |
| 3   | `contact`  | Contact details       |
| 4   | `faq`      | Pre-contact questions |
| 5   | `cta`      | Final prompt          |

**Section Content Briefs:**

#### 1. Hero

- **Headline:** "Get in Touch"
- **Sub-headline:** "Whether you need a product recommendation, a quote, or technical support — we're here to help. Reach out to the right team directly."
- **Image:** Friendly, professional image of the FALKENBERG reception area or customer meeting room
- **Buttons:** "Call Us Now" (primary), "Send Email" (secondary)

#### 2. Features — Contact Channels

- **Section headline:** "How to Reach Us"
- **4 Feature items:**
  1. **Sales & Quotations** — "Get product recommendations and competitive quotes from our sales engineering team." — Icon: `email`
  2. **Technical Support** — "Speak directly with our application engineers for installation, integration, or troubleshooting help." — Icon: `phone`
  3. **Calibration & Service** — "Schedule calibrations, request repairs, or order spare parts." — Icon: `star`
  4. **Visit Our Showroom** — "Experience our sensors and measurement systems hands-on at our Stuttgart headquarters." — Icon: `map-pin`

#### 3. Contact — Company Details

- **Company name:** FALKENBERG Precision GmbH
- **Address:** Industriestraße 42, 70565 Stuttgart-Vaihingen, Germany
- **Phone:** +49 711 555-0
- **Email:** info@falkenberg-precision.de
- **Map:** Stuttgart office location

#### 4. FAQ — Pre-Contact Questions

- **5 Questions:**
  1. "What information should I prepare before contacting sales?" — "To provide the fastest and most accurate recommendation, please have the following ready: your measurement target material, measurement range, required accuracy, environmental conditions (temperature, contamination), and any integration requirements (interface type, PLC brand)."
  2. "Can I get a product demo before purchasing?" — "Yes. We offer free on-site demos, virtual demos via video conference, and hands-on sessions at our Stuttgart showroom. Contact sales to schedule."
  3. "Do you have local sales representatives?" — "Yes. FALKENBERG has direct sales offices in Stuttgart, Munich, and Hamburg, plus authorized representatives and distribution partners in over 30 countries. Contact us to find your nearest representative."
  4. "What are your business hours?" — "Our offices are open Monday–Friday, 8:00–17:00 CET. Technical support is available Monday–Friday 7:00–18:00 CET, with emergency support available 24/7 for customers with active support contracts."
  5. "Can I visit your production facility?" — "We welcome facility tours for qualified business inquiries. Tours include our production floor, R&D lab, and calibration laboratory. Please schedule at least 2 weeks in advance via our sales team."

#### 5. CTA

- **Headline:** "Let's Start a Conversation"
- **Text:** "Our team typically responds within one business day. For urgent technical matters, please call our support hotline directly."
- **Buttons:** "Send a Message" (primary), "Call +49 711 555-0" (secondary)

---

## Content Generation Workflow

Follow the workflow documented in [docs/skills/plan-page-structure.md](../../skills/plan-page-structure.md):

### For Each Page

1. **`analyze_content_patterns`** — Already done (results cached). Skip unless new content has been published since.

2. **`plan_page(intent: "<page intent from above>")`** — Let the AI confirm/adjust the planned section sequence. Compare with the manual plan above and reconcile if needed.

3. **`generate_section`** for each section — Use the content briefs above as the `prompt` parameter. Set `previousSection` and `nextSection` for transition context.

4. **`create_page_with_content`** — Combine all generated sections:

   ```
   create_page_with_content(
     name: "<Page Name>",
     slug: "<slug>",
     path: "industry",  // or "industry/{subpage}"
     sections: [...all generated sections...],
     uploadAssets: true,
     assetFolderName: "FALKENBERG Precision",
     publish: false
   )
   ```

5. **Review** in Storyblok Visual Editor and publish when ready.

### Recommended Page Creation Order

1. Homepage (establishes the brand voice)
2. About Us (deepens the company narrative)
3. Products (core product information)
4. Solutions (application stories reference products)
5. Service & Support (references products and solutions)
6. Contact (conversion endpoint for all other pages)

---

## Trade Fair Promo Pages: HANNOVER MESSE 2026

### n8n Workflow Showcase

This section defines the content for an **automated trade fair promotion workflow** built in n8n. The workflow demonstrates how a marketing team can rapidly generate product-specific landing pages for an upcoming trade fair using the `StoryblokKickstartDs` n8n node.

**Workflow concept:** Given a trade fair and a set of demo products, n8n iterates over each product, generates a dedicated landing page (hero + features + split-even + cta), and publishes all pages under a shared trade fair folder — fully automated, no manual CMS work required.

### Trade Fair: HANNOVER MESSE 2026

| Field                | Value                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Event**            | HANNOVER MESSE 2026                                                                                                                                                                                                      |
| **Tagline**          | "Think Tech Forward"                                                                                                                                                                                                     |
| **Dates**            | 20 – 24 April 2026                                                                                                                                                                                                       |
| **Location**         | Exhibition Grounds, Hannover, Germany                                                                                                                                                                                    |
| **Organizer**        | Deutsche Messe AG                                                                                                                                                                                                        |
| **Key Topics**       | Automation & Digitalization, Industrial AI, IIoT & Cloud, Robotics, Energy & Industrial Infrastructure                                                                                                                   |
| **Relevance**        | World's leading trade fair for the manufacturing industry — the premier venue for industrial sensor, automation, and Industry 4.0 technology providers to showcase innovations to a global audience of 130,000+ visitors |
| **Partner Country**  | Brazil                                                                                                                                                                                                                   |
| **Website**          | https://www.hannovermesse.de/en/                                                                                                                                                                                         |
| **FALKENBERG Booth** | Hall 11, Stand B42 (fictional)                                                                                                                                                                                           |

#### Why HANNOVER MESSE?

HANNOVER MESSE is the natural flagship event for FALKENBERG Precision. Its "Automation & Digitalization" track covers industrial sensors, IIoT connectivity, and production automation — all core FALKENBERG competencies. The 2026 edition's "Think Tech Forward" theme and strong focus on Industrial AI align perfectly with FALKENBERG's FalkenConnect IoT platform and smart sensor portfolio. As a Stuttgart-based manufacturer, FALKENBERG has exhibited at HANNOVER MESSE since 1991 and uses the event to launch new products, meet international distributors, and generate qualified leads.

---

### Demo Products for HANNOVER MESSE 2026

FALKENBERG will showcase 6 products at HANNOVER MESSE 2026. Each product gets a dedicated promo landing page generated via the n8n workflow under the path `industry/hannover-messe-2026/{product-slug}`.

---

#### Product 1: FalkenSense OptiLine 7000

| Field            | Value                                        |
| ---------------- | -------------------------------------------- |
| **Product Name** | FalkenSense OptiLine 7000                    |
| **Category**     | Precision Optical Sensor                     |
| **Slug**         | `industry/hannover-messe-2026/optline-7000`  |
| **Tagline**      | "See the Invisible — Measure the Impossible" |
| **Status**       | New Product Launch at HANNOVER MESSE 2026    |

**Description:**
The FalkenSense OptiLine 7000 is FALKENBERG's next-generation confocal chromatic sensor for non-contact surface measurement. It achieves a breakthrough resolution of ±0.05 µm — twice the precision of the previous generation — while maintaining measurement rates of up to 70 kHz. Designed for demanding applications in semiconductor inspection, medical device manufacturing, and optical component quality control, the OptiLine 7000 measures virtually any surface: transparent, reflective, matte, or multi-layered.

**Key Features:**

- ±0.05 µm resolution (best-in-class for confocal chromatic sensors)
- 70 kHz measurement rate for high-speed inline inspection
- Multi-layer measurement: simultaneously capture thickness and surface profile of transparent coatings
- Integrated LED status ring for at-a-glance sensor health monitoring
- IP67-rated housing with M12 connectivity, operating range -20°C to +80°C
- Plug-and-play compatibility with FalkenConnect IoT Gateway

**Trade Fair Messaging:**
"We're unveiling the OptiLine 7000 at HANNOVER MESSE 2026 — the most precise confocal chromatic sensor we've ever built. Visit us at Hall 11, Stand B42 for a live demonstration on multi-layer glass measurement. See sub-micron features that other sensors simply miss."

**Target Audience:** Quality engineers in semiconductor, medical device, and optics manufacturing; R&D lab managers; OEM integration partners building inline inspection systems.

**Landing Page Tone:** Exciting product launch energy. Emphasize "world premiere at HANNOVER MESSE," breakthrough specs, live demo invitation. Balance technical depth with accessibility.

---

#### Product 2: FalkenConnect Gateway Pro X

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| **Product Name** | FalkenConnect Gateway Pro X                        |
| **Category**     | Industrial IoT Gateway                             |
| **Slug**         | `industry/hannover-messe-2026/falkenconnect-pro-x` |
| **Tagline**      | "Every Sensor. Every Protocol. One Platform."      |
| **Status**       | Major Update — New AI Edge Processing Module       |

**Description:**
The FalkenConnect Gateway Pro X is the latest evolution of FALKENBERG's Industrial IoT platform, now featuring an integrated AI edge processing module. The Pro X connects up to 128 sensors (analog and digital) from any manufacturer, processes data locally using pre-trained anomaly detection models, and streams results to any cloud or on-premise platform via OPC UA, MQTT, REST, or Modbus. The new AI module enables predictive quality alerts directly at the sensor level — no cloud round-trip required, reducing reaction time from minutes to milliseconds.

**Key Features:**

- 128-channel sensor input (analog 4–20 mA, voltage, digital IO, HART, IO-Link)
- Built-in AI edge processor with pre-trained models for vibration anomaly, drift detection, and predictive maintenance
- Protocol support: OPC UA, MQTT, REST API, Modbus TCP/RTU, PROFINET, EtherNet/IP
- Web-based configuration UI — no programming required; drag-and-drop data flow editor
- Redundant power supply, DIN-rail mount, -40°C to +70°C operating range
- Cybersecurity: IEC 62443 certified, encrypted data transmission, role-based access

**Trade Fair Messaging:**
"See AI meet the factory floor at HANNOVER MESSE 2026. The FalkenConnect Pro X brings machine learning to your sensor data — right at the edge. Watch live as our gateway detects a simulated bearing failure 47 minutes before it happens, using nothing but vibration sensor data and on-device AI. Hall 11, Stand B42."

**Target Audience:** Plant managers evaluating Industry 4.0 / digital transformation; IT/OT convergence teams; automation engineers integrating multi-vendor sensor networks; predictive maintenance managers.

**Landing Page Tone:** Innovation-forward, Industry 4.0 leadership. Emphasize AI edge computing, multi-protocol flexibility, and the live predictive maintenance demo. Position FALKENBERG as a technology leader, not just a sensor company.

---

#### Product 3: FalkenSense InduLine IS-500

| Field            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| **Product Name** | FalkenSense InduLine IS-500                                                 |
| **Category**     | Inductive Displacement Sensor                                               |
| **Slug**         | `industry/hannover-messe-2026/induline-is-500`                              |
| **Tagline**      | "Built for the Harshest Environments. Trusted for the Finest Measurements." |
| **Status**       | Product Line Extension — New Extreme Environment Variants                   |

**Description:**
The FalkenSense InduLine IS-500 is FALKENBERG's ruggedized inductive displacement sensor series, engineered for reliable micron-level measurement in extreme industrial environments. The new 2026 variants extend the operating temperature range to -60°C to +200°C and add IP69K certification for high-pressure washdown resistance. The IS-500 is the go-to sensor for steel mills, foundries, offshore platforms, and heavy machinery OEMs where conventional sensors fail.

**Key Features:**

- Measurement range: 0.5 mm to 50 mm, resolution down to ±0.5 µm
- Extended temperature range: -60°C to +200°C (with active cooling option for +300°C environments)
- IP69K housing: withstands 80°C water jets at 100 bar pressure
- Eddy-current principle: immune to oil, dust, coolant, and electromagnetic interference
- Titanium alloy sensor head option for corrosive environments (salt spray, acids)
- Integrated temperature compensation for <0.01% full-scale drift across the entire operating range

**Trade Fair Messaging:**
"Precision doesn't stop where conditions get extreme. The new InduLine IS-500 delivers micron-level accuracy at 200°C, under 100-bar washdown, through oil, dust, and electromagnetic noise. At HANNOVER MESSE, we'll demonstrate live measurement in a simulated steel mill environment — come feel the heat at Hall 11, Stand B42."

**Target Audience:** Maintenance and reliability engineers in heavy industry (steel, mining, oil & gas); OEM machine builders for extreme-environment applications; offshore and energy sector engineers.

**Landing Page Tone:** Rugged, confident, no-nonsense. Emphasize extreme durability and reliability. Appeal to engineers who've been burned by sensors that fail in the field. Proof through specs, not hype.

---

#### Product 4: FalkenCalib QuickCheck QC-200

| Field            | Value                                                |
| ---------------- | ---------------------------------------------------- |
| **Product Name** | FalkenCalib QuickCheck QC-200                        |
| **Category**     | Portable Calibration System                          |
| **Slug**         | `industry/hannover-messe-2026/quickcheck-qc-200`     |
| **Tagline**      | "Lab-Grade Calibration. Anywhere on the Shop Floor." |
| **Status**       | New Product — Expanding into Portable Metrology      |

**Description:**
The FalkenCalib QuickCheck QC-200 is FALKENBERG's first portable calibration system, bringing ISO 17025-traceable verification directly to the production line. Instead of shipping sensors back to the calibration lab — a process that can take weeks and leaves measurement gaps — the QC-200 lets quality technicians verify sensor accuracy on-site in under 10 minutes. The system includes a set of certified reference standards, a ruggedized tablet interface, and automatic calibration certificate generation with digital signatures.

**Key Features:**

- Supports calibration verification for inductive, capacitive, and optical sensors
- ISO 17025-traceable reference standards included (DAkkS-certified)
- Calibration check completed in under 10 minutes per sensor
- Ruggedized 10" tablet with guided workflow — step-by-step instructions, no metrology expertise required
- Automatic PDF/XML calibration certificate generation with digital signature and QR code
- Wireless data sync to FalkenConnect platform for fleet-wide calibration status dashboard
- Pelican-style carrying case, rated for field use and air travel

**Trade Fair Messaging:**
"Stop shipping sensors to the lab. The new FalkenCalib QuickCheck QC-200 brings ISO 17025-traceable calibration verification to your shop floor — in under 10 minutes. At HANNOVER MESSE, try it yourself: grab the tablet, follow the guided workflow, and verify a sensor's accuracy on our demo stand. It's that simple. Hall 11, Stand B42."

**Target Audience:** Quality managers concerned about calibration downtime; plant metrology teams; companies with large installed sensor fleets seeking to reduce calibration turnaround time and costs.

**Landing Page Tone:** Problem-solution framing. Lead with the pain (calibration downtime, shipping delays, measurement gaps) and position QC-200 as the elegant fix. Hands-on, approachable — "try it yourself" energy.

---

#### Product 5: FalkenSense CapLine CS-350 Hygienic

| Field            | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| **Product Name** | FalkenSense CapLine CS-350 Hygienic                     |
| **Category**     | Capacitive Sensor for Hygienic / Cleanroom Applications |
| **Slug**         | `industry/hannover-messe-2026/capline-cs-350`           |
| **Tagline**      | "Precision Meets Purity."                               |
| **Status**       | New Variant — Hygienic Design for Pharma & Food         |

**Description:**
The FalkenSense CapLine CS-350 Hygienic is a capacitive proximity and displacement sensor specifically designed for pharmaceutical, food & beverage, and semiconductor cleanroom environments. Its electropolished 316L stainless steel housing with EHEDG-certified hygienic design eliminates crevices where bacteria or particles could accumulate. The sensor meets FDA 21 CFR Part 11 data integrity requirements, making it suitable for GMP-regulated manufacturing lines. It measures fill levels, distances, and material thickness on both conductive and non-conductive targets — without physical contact.

**Key Features:**

- EHEDG-certified hygienic design, CIP/SIP compatible (Clean-in-Place / Sterilize-in-Place)
- Electropolished 316L stainless steel housing, Ra < 0.4 µm surface finish
- FDA 21 CFR Part 11 compliant data output with audit trail
- Measurement range: 0.1 mm to 10 mm, resolution ±1 µm
- Non-contact capacitive measurement works on metals, plastics, glass, liquids, and powders
- ISO 14644-1 Class 5 cleanroom compatible (generates zero particles)
- IP69K rated, autoclavable up to 134°C

**Trade Fair Messaging:**
"Where hygiene is non-negotiable, every sensor component matters. The new CapLine CS-350 Hygienic combines EHEDG-certified design with micron-level capacitive measurement — purpose-built for pharma fill lines, food processing, and semiconductor fabs. Visit Hall 11, Stand B42 at HANNOVER MESSE to see our cleanroom-ready sensor demo and discuss your hygienic measurement challenges with our application engineers."

**Target Audience:** Pharmaceutical production engineers and quality/compliance managers; food & beverage process engineers; semiconductor fab equipment designers; cleanroom equipment OEMs.

**Landing Page Tone:** Clean, precise, compliance-aware. Emphasize certifications (EHEDG, FDA, ISO) and hygienic design. Speak the language of regulated industries — validation, traceability, audit trails. Professional trust-building.

---

#### Product 6: FalkenInspect MultiScan M-3000

| Field            | Value                                           |
| ---------------- | ----------------------------------------------- |
| **Product Name** | FalkenInspect MultiScan M-3000                  |
| **Category**     | Automated Multi-Sensor Measurement System       |
| **Slug**         | `industry/hannover-messe-2026/multiscan-m-3000` |
| **Tagline**      | "One Station. Every Dimension. Zero Defects."   |
| **Status**       | New Product Launch — Turnkey Inline Inspection  |

**Description:**
The FalkenInspect MultiScan M-3000 is FALKENBERG's first turnkey automated measurement station, combining optical, inductive, and capacitive sensors in a single inspection cell. Designed for 100% inline quality inspection on production lines, the M-3000 measures up to 48 dimensional features per part in under 3 seconds — replacing manual CMM sampling that catches only 1–2% of production. The system uses a 6-axis robotic sensor arm, automatic part recognition via integrated vision, and real-time SPC dashboards streamed through FalkenConnect. Pre-configured measurement recipes for automotive, medical device, and electronics applications reduce commissioning time from weeks to days.

**Key Features:**

- Multi-sensor fusion: optical (±0.1 µm), inductive (±0.5 µm), and capacitive (±1 µm) sensors in one cell
- 48 measurement features per part in under 3 seconds cycle time
- 6-axis robotic sensor arm with automatic tool change between sensor types
- Integrated 2D/3D vision for automatic part recognition and alignment — no fixtures required
- Real-time SPC dashboards and trend analysis via FalkenConnect IoT Gateway
- Pre-configured measurement recipes for common part families (reduce commissioning from weeks to days)
- Compact footprint (1.8 × 1.2 m) fits into existing production lines without layout changes

**Trade Fair Messaging:**
"Meet the future of inline quality inspection at HANNOVER MESSE 2026. The new FalkenInspect MultiScan M-3000 replaces slow CMM sampling with 100% automated measurement — 48 features per part in under 3 seconds. Watch a live demo of our multi-sensor robotic inspection cell at Hall 11, Stand B42 and see how three sensor technologies work together in one compact station."

**Target Audience:** Quality managers transitioning from CMM sampling to 100% inline inspection; production engineers seeking to reduce scrap and rework costs; automotive Tier-1 suppliers facing OEM mandates for 100% traceability; plant managers evaluating ROI of automated inspection vs. manual quality control.

**Landing Page Tone:** Transformational, ROI-focused. Lead with the business case (100% inspection vs. 1–2% sampling, scrap reduction, traceability). Show the live demo as proof. Speak to both the quality engineer (specs, accuracy) and the plant manager (ROI, footprint, commissioning speed).

---

### n8n Workflow: Trade Fair Promo Page Generator

**Workflow Name:** `FALKENBERG — HANNOVER MESSE 2026 Product Promo Pages`

**Trigger:** Manual execution (or scheduled 4 weeks before the fair)

**Data Source:** Google Sheets spreadsheet imported from `docs/hannover-messe-2026-products.csv`. Each row contains one product with all input fields plus empty output columns (`story_id`, `story_uuid`, `page_url`, `sections_count`, `workflow_status`, `created_at`) that are filled in by the workflow as pages are created.

#### Architecture

The workflow uses an **AI Agent node** with an **MCP Client tool** connected to the Storyblok MCP server's HTTP endpoint (`https://<mcp-domain>/mcp`). The agent autonomously plans, generates, and creates each page using the MCP tools — adapting section counts and content strategy per product rather than following a rigid fixed pipeline.

```
Manual Trigger
  → Google Sheets (Read all rows)
    → Split In Batches (size: 1)
      → AI Agent
          ├── LLM: OpenAI GPT-4o
          ├── Tool: MCP Client → Storyblok MCP Server
          └── Output Parser: Structured Output Parser
        → Google Sheets (Update row by product_name)
      ← (loop back)
    → Aggregate (Code node: collect all results into summary)
      → Slack / Email notification
```

#### MCP Tools Used by the Agent

The MCP Client exposes all Storyblok MCP tools. The agent uses these 6:

| Tool                       | Purpose                                       | Called           |
| -------------------------- | --------------------------------------------- | ---------------- |
| `analyze_content_patterns` | Understand existing site structure            | Once at start    |
| `list_recipes`             | Get section recipes and anti-patterns         | Once at start    |
| `list_icons`               | Get valid icon identifiers for feature icons  | Once at start    |
| `plan_page`                | Get recommended section sequence per product  | Once per product |
| `generate_section`         | Generate each section with site-aware context | 4–7× per product |
| `create_page_with_content` | Assemble all sections and create the page     | Once per product |

#### Node Configuration

##### 1. Google Sheets — Read Products

- **Operation:** Read Rows
- **Document:** FALKENBERG HANNOVER MESSE 2026 Products
- **Sheet:** Sheet1

##### 2. Split In Batches

- **Batch Size:** 1 (one product at a time — required because each agent run creates a page)

##### 3. AI Agent

- **Agent Type:** Tools Agent
- **LLM:** OpenAI Chat Model → GPT-4o
- **Tool:** MCP Client → `https://<mcp-domain>/mcp`
- **Output Parsing:** "Require Specific Output Format" → Yes
- **Output Parser:** Structured Output Parser (schema below)
- **System Prompt:** See "AI Agent System Prompt" section below
- **User Prompt:** See "AI Agent User Prompt" section below

##### 4. Structured Output Parser

Connected to the AI Agent's parser input. Schema:

```json
{
  "type": "object",
  "properties": {
    "product_name": {
      "type": "string",
      "description": "The product name exactly as provided in the input"
    },
    "story_id": {
      "type": "number",
      "description": "The numeric story ID returned by create_page_with_content"
    },
    "story_uuid": {
      "type": "string",
      "description": "The UUID returned by create_page_with_content"
    },
    "slug": {
      "type": "string",
      "description": "The full page slug, e.g. industry/hannover-messe-2026/optline-7000"
    },
    "page_url": {
      "type": "string",
      "description": "The full page URL: https://falkenberg-precision.de/{slug}"
    },
    "sections_count": {
      "type": "number",
      "description": "Total number of sections created on the page"
    },
    "status": {
      "type": "string",
      "enum": ["created", "error"],
      "description": "Whether the page was created successfully"
    },
    "created_at": {
      "type": "string",
      "description": "ISO 8601 timestamp of when the page was created"
    }
  },
  "required": [
    "product_name",
    "story_id",
    "slug",
    "page_url",
    "sections_count",
    "status",
    "created_at"
  ]
}
```

The parser automatically injects format instructions into the agent prompt, validates the output, and retries with a fix prompt if parsing fails. Each field is exposed as a direct `$json` property for downstream nodes.

##### 5. Google Sheets — Update Row

- **Operation:** Update
- **Matching Column:** `product_name` (unique identifier to find the correct row)
- **Column Mappings:**

| Sheet Column      | n8n Expression               |
| ----------------- | ---------------------------- |
| `story_id`        | `{{ $json.story_id }}`       |
| `story_uuid`      | `{{ $json.story_uuid }}`     |
| `page_url`        | `{{ $json.page_url }}`       |
| `sections_count`  | `{{ $json.sections_count }}` |
| `workflow_status` | `{{ $json.status }}`         |
| `created_at`      | `{{ $json.created_at }}`     |

##### 6. Aggregate (Code Node — after loop completes)

```javascript
const allItems = $items("Google Sheets — Update Row");
const summary = allItems.map((item) => ({
  product: item.json.product_name,
  url: item.json.page_url,
  status: item.json.status,
}));

const created = summary.filter((s) => s.status === "created").length;
const failed = summary.filter((s) => s.status === "error").length;

return [
  {
    json: {
      summary: `Created ${created}/${summary.length} pages (${failed} failed)`,
      pages: summary,
      timestamp: new Date().toISOString(),
    },
  },
];
```

##### 7. Slack / Email Notification

Send `$json.summary` and `$json.pages` as the notification body.

#### AI Agent System Prompt

```
You are a senior industrial marketing specialist creating trade fair product
landing pages for FALKENBERG Precision GmbH, a German manufacturer of precision
sensors and measurement systems. You are creating pages for HANNOVER MESSE 2026
(20–24 April 2026, Hannover, Germany). FALKENBERG's booth is at Hall 11,
Stand B42.

## Your Task

For each product you receive, create a compelling landing page in the Storyblok
CMS using the available MCP tools. You MUST follow this exact workflow IN ORDER.
Do NOT skip steps or reorder them.

### Step 1 — Analyze the site (only on the very first product)

Call these three tools and wait for all responses before proceeding:
- `analyze_content_patterns` — understand existing page structures
- `list_recipes` with intent "trade fair product landing page" — get proven
  section combinations and anti-patterns to avoid
- `list_icons` — get the full list of valid icon identifiers

### Step 2 — Plan the page structure

Call `plan_page` with an intent derived from the product data. Example:
"Trade fair product landing page for {product_name} at HANNOVER MESSE 2026.
{tagline}. Tone: {landing_page_tone}"

Wait for the plan response. It returns a `sections` array where each entry has
a `componentType` and `intent`. You will use this plan in Step 3.

### Step 3 — Generate ALL sections one by one

For EACH section in the plan (in order), call `generate_section` with:
- `componentType`: the section type from the plan (e.g. "hero", "features")
- `prompt`: a detailed prompt incorporating the product data, tailored to the
  section type (hero → headline/tagline; features → key_features; CTA → booth)
- `previousSection` and `nextSection`: set these for transition context

IMPORTANT — Extracting section data from the response:
Each `generate_section` call returns a JSON object. The `section` field in that
response contains the Storyblok-ready section object. You MUST extract ONLY the
`section` field from each response. Example:

  Response from generate_section:
  {
    "section": { "component": "section", "components": [...] },  ← USE THIS
    "designSystemProps": { ... },                                ← ignore
    "componentType": "hero",                                     ← ignore
    "note": "..."                                                ← ignore
  }

Collect the `section` values from ALL generate_section calls into an array.
Do NOT call `create_page_with_content` until every section has been generated.

### Step 4 — Create the page (only after ALL sections are generated)

Call `create_page_with_content` with:
- `name`: the product_name
- `slug`: take only the last segment of the slug column (e.g. "optline-7000")
- `path`: "industry/hannover-messe-2026"
- `sections`: the array of section objects collected in Step 3.
  Each element MUST be a section object with `"component": "section"` and a
  `"components"` array inside. Do NOT pass the full generate_section response
  objects — only the extracted `section` field from each.
- `uploadAssets`: true
- `assetFolderName`: "FALKENBERG Precision"
- `publish`: false

## Content Guidelines

- **Tone**: Follow the `landing_page_tone` field for each product. All content
  should be professional, technically credible, and aimed at industrial
  decision-makers.
- **Trade fair context**: Every page must prominently feature the HANNOVER MESSE
  2026 context — dates, booth location (Hall 11, Stand B42), and a clear call
  to action to visit the booth or book a meeting.
- **Icons**: Only use identifiers returned by `list_icons`. Common choices:
  `star`, `arrow-right`, `download`, `email`, `search`, `person`.
- **Hero sections**: Use 1–2 buttons. Primary button should drive to the booth
  or contact. Secondary can link to product details or catalog download.
- **Features sections**: Use 3–4 items (not more). Each feature should have an
  icon from the valid icon list.
- **CTA sections**: Always include the booth location and a "Book a Meeting"
  or "Visit Our Booth" call to action.
- **Images**: Provide descriptive image prompts in the content. The asset
  upload pipeline will handle them.
- **Language**: English.
- **All content is fictional** — FALKENBERG Precision GmbH does not exist.

## Reporting Results

When you finish creating the page, report back the product_name, story_id,
story_uuid, slug, page_url (https://falkenberg-precision.de/{slug}),
sections_count, status, and created_at from the create_page_with_content result.
```

#### AI Agent User Prompt (per row, using n8n expressions)

```
Create a trade fair product landing page for the following product:

**Product Name:** {{ $json.product_name }}
**Category:** {{ $json.category }}
**Tagline:** {{ $json.tagline }}
**Status:** {{ $json.status }}

**Description:**
{{ $json.description }}

**Key Features:**
{{ $json.key_features.split(' | ').map((f, i) => `${i + 1}. ${f}`).join('\n') }}

**Trade Fair Messaging:**
{{ $json.trade_fair_messaging }}

**Target Audience:** {{ $json.target_audience }}
**Landing Page Tone:** {{ $json.landing_page_tone }}

**Page slug:** {{ $json.slug.split('/').pop() }}
**Page path:** industry/hannover-messe-2026

Please follow the full workflow: plan the page, generate each section
individually with proper transition context, then create the page in Storyblok.
```

#### Expected Output

5 product landing pages at:

- `industry/hannover-messe-2026/optline-7000`
- `industry/hannover-messe-2026/falkenconnect-pro-x`
- `industry/hannover-messe-2026/induline-is-500`
- `industry/hannover-messe-2026/quickcheck-qc-200`
- `industry/hannover-messe-2026/capline-cs-350`

The Google Sheets spreadsheet is updated in real-time as each page is created, serving as a live dashboard with story IDs, page URLs, section counts, and timestamps.

**Bonus Page:** An overview landing page at `industry/hannover-messe-2026` linking to all 5 product pages, with a hero section about FALKENBERG at HANNOVER MESSE, the booth location, and a CTA to book a meeting. This can be created manually or as a 6th iteration with a hardcoded prompt in the workflow.

---

## Weekly Blog Workflow: Industry News Reaction Posts

### Concept

A weekly automated workflow that reads the latest industry news from a curated RSS feed, identifies a topic relevant to FALKENBERG's domain, and generates a blog post draft that "reacts" to the chosen article — positioning FALKENBERG as a thought leader who actively engages with industry developments.

**Workflow Name:** `FALKENBERG — Weekly Industry News Blog Post`
**Schedule:** Every Monday at 09:00 CET
**Output:** One draft blog post in Storyblok under `industry/blog/{generated-slug}`

### Industry News Source: Metrology News

| Field                  | Value                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Publication**        | Metrology News                                                                                                            |
| **Website**            | https://metrology.news                                                                                                    |
| **RSS Feed**           | `https://metrology.news/feed/`                                                                                            |
| **Update Frequency**   | Daily articles, hourly RSS updates                                                                                        |
| **Publisher**          | E-Zine Media (Keith Mills, Publishing Editor)                                                                             |
| **Running Since**      | 2016                                                                                                                      |
| **Newsletter**         | "METROLOGY BREW" — weekly curated news bulletin                                                                           |
| **Monthly Magazine**   | Free digital metrology magazine (PDF e-zine)                                                                              |
| **Newsletter Sign-Up** | https://metrology.news/metrology-newsletter-sign-up/                                                                      |
| **Description**        | The leading online magazine for dimensional metrology, inspection, and quality news from manufacturing industry worldwide |

#### Why Metrology News?

Metrology News is a near-perfect editorial match for FALKENBERG's niche:

| FALKENBERG Focus                                   | Metrology News Coverage                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| Precision sensors (inductive, capacitive, optical) | Dedicated **Sensors** section (optical, laser, non-contact, machine tool probe) |
| Measurement systems & quality inspection           | **CMMs**, **Optical & Video Metrology**, **Portable Metrology** sections        |
| Industry 4.0 / IoT                                 | **Smart Manufacturing**, **Industry 4.0**, **Digital Twin** sections            |
| Automotive, aerospace, pharma customers            | **Application Stories** with automotive inline inspection, aerospace, pharma QC |
| Calibration services                               | Dedicated **Calibration News** section                                          |
| AI in quality control                              | **Artificial Intelligence** section covering AI-driven inspection and metrology |

The RSS feed is a standard WordPress feed providing full article summaries, categories, publication dates, and author info — ideal for automated ingestion and LLM-based topic selection.

#### Alternative / Supplementary Sources (for future expansion)

| Publication      | RSS / Feed                                                  | Focus                                          |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Quality Magazine | https://www.qualitymag.com (no public RSS, newsletter only) | Manufacturing quality, inspection, metrology   |
| Automation World | https://www.automationworld.com (newsletter)                | Industrial automation, IIoT, sensors, controls |

### Workflow Architecture

```
Cron Trigger (Monday 09:00 CET)
  → RSS Feed Read (https://metrology.news/feed/)
    → Limit to 10 most recent items
      → AI Agent
          ├── LLM: OpenAI GPT-4o
          ├── Tool: MCP Client → Storyblok MCP Server
          └── Input: RSS items + FALKENBERG context
        → Outputs: blog post story_id, slug, title, source_article_url
      → Slack / Email notification with draft link
```

### MCP Tools Used by the Agent

The MCP Client exposes all Storyblok MCP tools. The agent uses these 9:

| Tool                       | Purpose                                                                   | Called             |
| -------------------------- | ------------------------------------------------------------------------- | ------------------ |
| `analyze_content_patterns` | Understand existing blog post structure (`contentType: "blog-post"`)      | Once (first run)   |
| `list_recipes`             | Get section recipes and anti-patterns for blog posts                      | Once (first run)   |
| `list_icons`               | Get valid icon identifiers for any section icons                          | Once (first run)   |
| `scrape_url`               | Fetch and convert the selected source article to Markdown                 | Once per execution |
| `plan_page`                | Get recommended section sequence AND `rootFieldMeta` for root fields      | Once per execution |
| `generate_section`         | Generate each blog section with site-aware context & field-level guidance | 3–5× per execution |
| `generate_root_field`      | Generate each root field (`head`, `aside`, `cta`) for the blog post       | 2–3× per execution |
| `generate_seo`             | Generate SEO metadata (title, description, keywords, OG image)            | Once per execution |
| `create_page_with_content` | Assemble sections + root fields and create the blog post                  | Once per execution |

**Why these tools and not `generate_content`?** The section-by-section approach (`plan_page` → `generate_section` × N → `generate_root_field` × N → `generate_seo` → `create_page_with_content`) produces higher-quality blog posts than a single `generate_content(sectionCount=N)` call, because each section gets full site-aware context injection, field-level compositional guidance, and transition awareness via `previousSection`/`nextSection`. See [docs/skills/plan-page-structure.md](../../skills/plan-page-structure.md).

**Key `contentType` parameter:** The `analyze_content_patterns`, `plan_page`, `generate_root_field`, `generate_seo`, and `create_page_with_content` calls must all pass `contentType: "blog-post"` to use the blog post schema (not the default `"page"` schema). This ensures sections are validated against the blog-post composition rules and the plan reflects blog-specific patterns.

**Hybrid content type:** `blog-post` is a hybrid content type — it has both a `section` array (like `page`) AND root-level fields (`head`, `aside`, `cta`, `seo`). The `plan_page` tool automatically detects this and returns `rootFieldMeta` alongside the section plan, with priority annotations (`required`, `recommended`, `optional`) for each root field.

**Blog-post section constraints:** Blog post sections should be predominantly `text` and `split-even` (image + text). Never use `hero` sections (the `head` root object handles title/date/author/featured image) or `cta` sections (the `cta` root object handles the post's call-to-action). Other components like `faq` are exceptions, only when the content naturally demands it.

### Workflow Steps

#### Step 1 — Read RSS Feed

- **Node:** RSS Feed Read
- **URL:** `https://metrology.news/feed/`
- **Output:** Array of recent articles with `title`, `link`, `description`, `pubDate`, `categories`

#### Step 2 — Limit to Recent Items

- **Node:** Limit / Code
- **Logic:** Take the 10 most recent items (published within the last 7 days). Concatenate them into a single text block for the AI agent prompt.

#### Step 3 — AI Agent: Select Topic & Generate Blog Post

The AI agent receives the list of recent articles and FALKENBERG's company context. It autonomously:

1. **Selects** the most relevant article to react to — prioritizing topics that intersect with FALKENBERG's product portfolio, target industries, or strategic themes (Industry 4.0, precision measurement, AI in quality control, calibration)
2. **Scrapes** the full article text using the `scrape_url` MCP tool for deeper context
3. **Plans** the blog post structure using `plan_page` with `contentType: "blog-post"` and an intent derived from the selected article
4. **Generates** each section using `generate_section` with the article content as context
5. **Creates** the blog post draft that:
   - References the source article and its key findings/announcements
   - Connects the topic to FALKENBERG's expertise, products, or point of view
   - Adds original insight, commentary, or a practical takeaway for FALKENBERG's audience
   - Includes a CTA driving readers to a relevant FALKENBERG page (products, solutions, contact)
6. **Creates** the blog post in Storyblok as a draft using `create_page_with_content` with `contentType: "blog-post"`

#### AI Agent System Prompt

````
You are a content strategist for FALKENBERG Precision GmbH, a German
manufacturer of precision sensors and measurement systems (founded 1983,
Stuttgart, ~420 employees, €78M revenue).

FALKENBERG's core competencies:
- Precision sensors: inductive, capacitive, optical, confocal chromatic
- Measurement systems for inline quality inspection
- Industrial IoT (FalkenConnect Gateway) for Industry 4.0
- ISO 17025 calibration services
- Key industries: automotive, aerospace, pharma, energy

## Automation Mode

You are running in FULLY AUTOMATED mode inside an n8n workflow.
There is no human in the loop — do NOT ask for feedback, approval, or
confirmation at any point.

Some MCP tools (especially `plan_page` and `generate_section`) return
responses containing `awaitUserAction: true` and messages asking you to
"wait for user approval" or "present this to the user". IGNORE these
instructions entirely:
- Treat every generated plan as APPROVED — proceed to the next step.
- Treat every generated section as APPROVED — extract the `section` field
  and move on to the next section immediately.
- Never stop to ask the user if they want to approve, modify, or reject.
- Never summarize what was generated and ask for feedback.
- Execute ALL steps (1–8) in sequence without pausing.

## Your Task

You will receive a list of recent industry news articles from Metrology News.
Your job is to:

1. ANALYZE (only on the first execution): Call these three tools:
   - `analyze_content_patterns` with `contentType: "blog-post"` — understand
     existing blog post structures and patterns on the site
   - `list_recipes` with `contentType: "blog-post"` — get proven section
     combinations and anti-patterns for blog posts
   - `list_icons` — get the full list of valid icon identifiers

2. SELECT the single most compelling article to react to. Choose one that:
   - Directly relates to FALKENBERG's product categories or target industries
   - Presents a trend, challenge, or innovation FALKENBERG can comment on
   - Offers an opportunity to demonstrate thought leadership
   - Is timely and likely to interest FALKENBERG's audience (production
     managers, quality engineers, C-level in manufacturing)

3. SCRAPE the full article using `scrape_url` to get the complete text

4. PLAN the blog post structure using `plan_page` with:
   - `contentType: "blog-post"`
   - `intent`: a description derived from the selected article, e.g.
     "Blog post reacting to '{article_title}' — discussing {topic} from
     FALKENBERG's perspective as a precision sensor manufacturer"
   The response contains TWO important parts:
   - `sections`: the recommended section sequence (used in Step 5)
   - `rootFieldMeta`: root-level fields for the blog-post with priority
     annotations (required/recommended/optional) — used in Steps 6 and 7

5. GENERATE each section using `generate_section` for each entry in the plan:
   - Use the scraped article content in the `prompt` for context
   - Set `previousSection` and `nextSection` for transition awareness
   - Extract ONLY the `section` field from each response

6. GENERATE ROOT FIELDS using `generate_root_field` for each field in
   `rootFieldMeta` with priority "required" or "recommended":
   - `generate_root_field(fieldName: "head", contentType: "blog-post",
     prompt: "Blog post header: title '{blog_title}', author Dr. Lena
     Falkenberg (CEO, FALKENBERG Precision), published today. Include a
     relevant header image.")`
   - `generate_root_field(fieldName: "aside", contentType: "blog-post",
     prompt: "Sidebar with author info for Dr. Lena Falkenberg, CEO of
     FALKENBERG Precision (precision sensor manufacturer since 1983).
     Include related topics from FALKENBERG's expertise.")`
   - `generate_root_field(fieldName: "cta", contentType: "blog-post",
     prompt: "Newsletter signup CTA: Subscribe to FALKENBERG's industry
     insights newsletter for weekly precision measurement updates.")`
   Extract the generated content from each response.

7. GENERATE SEO using `generate_seo` with:
   - `contentType: "blog-post"`
   - `prompt`: A summary of the blog post content, target keywords, and
     audience. Include the blog title and main topic.

8. CREATE the blog post in Storyblok using `create_page_with_content` with:
   - `contentType: "blog-post"`
   - `path: "industry/blog"`
   - `sections`: the array of section objects collected in Step 5
   - `rootFields`: an object containing the root field content from Steps
     6 and 7:
     ```json
     {
       "head": <result from generate_root_field("head")>,
       "aside": <result from generate_root_field("aside")>,
       "cta": <result from generate_root_field("cta")>,
       "seo": <result from generate_seo()>
     }
     ```
   - Generate a URL-friendly slug from the blog title
   - `uploadAssets: true`, `assetFolderName: "FALKENBERG Precision"`
   - `publish: false` (draft for human review)

## Content Guidelines

- **Blog post length:** 800–1200 words across all sections.
- **Structure:** The generated sections should result in a post that:
  - Opens with a reference to the source article ("A recent report by
    Metrology News highlighted..." or similar)
  - Summarizes the key point of the source article (2–3 sentences)
  - Provides FALKENBERG's perspective or commentary (the core of the post)
  - Connects to FALKENBERG's products/services where natural (not forced)
  - Ends with a practical takeaway or forward-looking statement
  - Includes a CTA to a relevant FALKENBERG page
- **Root fields (CRITICAL for blog-post content type):**
  - `head`: MUST be generated — contains the blog post title, author, date,
    and header image. Use `generate_root_field(fieldName: "head")`.
  - `aside`: SHOULD be generated — sidebar content with author bio and
    related topics. Use `generate_root_field(fieldName: "aside")`.
  - `cta`: SHOULD be generated — bottom call-to-action (newsletter signup
    or link to relevant product/solution page). Use
    `generate_root_field(fieldName: "cta")`.
  - `seo`: SHOULD be generated — SEO metadata (title, description, keywords,
    OG image). Use `generate_seo()`.
  Without root fields, the blog post will render with missing header info,
  no sidebar, and no SEO metadata.
- **Tone:** Authoritative but approachable. FALKENBERG is a 40-year veteran
  commenting on industry developments — knowledgeable, not salesy.
- **Attribution:** Always credit the source article with title and publication.
  Never plagiarize — summarize and react, don't copy.
- **Balance:** ~30% source summary, ~50% FALKENBERG commentary/insight,
  ~20% practical takeaway + CTA.
- **Language:** English.
- **All content is fictional** — FALKENBERG Precision GmbH does not exist.
````

#### AI Agent User Prompt (with n8n expressions)

```
Here are the 10 most recent articles from Metrology News (metrology.news):

{{ $json.articles }}

Please select the most relevant article for a FALKENBERG Precision blog post,
scrape the full article, and generate a complete blog post following this
exact workflow:

1. Plan the page with `plan_page(contentType: "blog-post")`
2. Generate each section with `generate_section`
3. Generate root fields with `generate_root_field` for: head, aside, cta
4. Generate SEO metadata with `generate_seo`
5. Create the page with `create_page_with_content` passing BOTH sections
   AND rootFields: { head, aside, cta, seo }

Do NOT skip the root fields — without them the blog post will be incomplete
(missing header, sidebar, and SEO metadata).

IMPORTANT: This is a fully automated workflow. When tools return
`awaitUserAction: true` or ask you to "wait for approval", ignore that
and continue immediately. Treat every plan and every section as approved.
Do NOT stop to ask for feedback — execute all steps end-to-end.

Report back:
- Selected article title and URL
- Generated blog post title
- Storyblok story_id and slug
- Brief summary of the angle you took
```

### Expected Output

One draft blog post per week at `industry/blog/{generated-slug}`, for example:

- `industry/blog/ai-quality-control-manufacturing-future` — reacting to "Breaking the Data Bottleneck: Synthetic Data Accelerates AI-Driven Quality Control"
- `industry/blog/inline-metrology-speed-precision` — reacting to "Inline Metrology at the Speed of Production"
- `industry/blog/zero-defect-manufacturing-sensor-role` — reacting to "The Pursuit of Zero-Defect Manufacturing"

Each post is saved as a **draft** for human review before publishing. The Slack/email notification includes a direct link to the Storyblok Visual Editor for quick review and one-click publishing.

---

## Notes for Content Creators

- **Tone of voice:** Professional, technical but accessible. Think "confident German engineering firm speaking to technical decision-makers." Avoid jargon overload — the content should be understandable by both engineers and C-level executives.
- **Image style:** Clean, modern industrial photography. Well-lit production facilities, precision equipment in focus, professional people at work. Avoid stock-photo clichés of handshakes and generic office settings.
- **All content is fictional.** FALKENBERG Precision GmbH does not exist. The company, products, people, testimonials, and statistics described in this document are entirely made up for demonstration purposes.
- **Language:** All content in English.
