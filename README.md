## Inspiration
We were inspired to work on a healthcare-oriented project by Impiricus' sponsor challenge. The idea of being able to build something that could have real-world benefits on people's health was very exciting to us, and made this sponsor challenge stand out from the other tracks.

## What it does
ChronologiCare allows healthcare providers to view active prescriptions for their patients. For each prescription, ChronologiCare provides an interactive timeline filled with new literature on the patients' medication. It utilizes AI-powered insights to score these studies based on their relevance and potential importance to the patient based on their health records, allowing doctors to quickly and easily identify new considerations for patients' treatments. It provides quick summaries of these studies and describes their specific relevance to each patient. Ultimately, it serves as a convenient way for healthcare providers to stay up-to-date on research involving their patients' treatments.

## How we built it
We built ChronologiCare primarily using Next.js. We first focused on structuring our database and setting up API routes. We then populated it with real publications from PubMed. From there, we spent a lot of time developing the user experience on the frontend to ensure the information was presented in an engaging and practical way. Finally, used Gemini's API to provide AI-powered insights on the data and help organize the studies based on relevance to individual patients.

## Challenges we ran into
One challenge we ran into was that many of the studies on PubMed were not necessarily relevant to every patient. While they may involve the same medicine, they did not always provide useful information for healthcare providers treating specific patients. To solve this, we integrated Gemini to filter through the papers and ensure that we could prioritize papers most relevant to patients' needs.

Another challenge we faces was making the timeline as engaging as it is now. We knew from the beginning that it would be the main feature of the app, so we had high standards for it's implementation. We tried a lot of different designs and features, but eventually came to a consensus.

## Accomplishments that we're proud of
We are really happy with how the UI turned out. It was something we wanted to put a lot of emphasis on, especially the timeline. We're really glad that after a lot of experimentation, we ended up with a design that flows well and is engaging and intuitive for the user. 

We're also really glad that we were able to create a piece of software that could potentially improve healthcare providers' ability to stay up-to-date on treatments and best practices. It's always a good feeling when you can use your skills to help others.

## What we learned
Throughout this project, we learned a lot about Next.js and full-stack web development in general. With how much time we spent considering design decisions, we learned a lot about user experience and how to design apps well. 

## What's next for ChronologiCare
The next step would be to integrate our app with EMR software, allowing healthcare providers to seamlessly and securely transfer their patient data over to ChronologiCare. We understand that healthcare providers are very busy, so this feature is definitely a high priority for the future.
