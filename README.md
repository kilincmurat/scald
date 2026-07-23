# SCALD

**Data-driven Decision Support Ecosystem for Local Governments**

SCALD helps municipalities assess their climate-adaptation and sustainability
performance through a structured indicator framework, compute an ecological
footprint and set-level scores, and produce official reports — with role-based
workflows for data entry, decision-maker approval, and cross-municipality
research.

## Architecture

Monorepo managed with pnpm workspaces and Turborepo:

- `apps/web` — Next.js 15 (App Router) / React 19 / TypeScript / Tailwind front end
- `apps/api` — FastAPI service
- `apps/ai-service` — AI decision-support / recommendation service
- PostgreSQL (self-hosted) with row-level security

The stack is designed to be **self-hosted and portable** — deployable on a
partner's own infrastructure without any cloud-only managed services.

## Licence

The source code is licensed under the **European Union Public Licence v. 1.2
(EUPL-1.2)** — see [LICENSE](LICENSE). Third-party components are listed in
[NOTICE](NOTICE) and remain under their own licences.

Project documentation, the indicator methodology, and generated report
templates (content, not code) are made available under
**Creative Commons Attribution 4.0 International (CC BY 4.0)**.

The EUPL is an OSI-approved, weak-copyleft licence published by the European
Commission with equal legal value in all official EU languages, and is
compatible with the GPL/AGPL/MPL families — chosen here because SCALD is an
EU-funded tool for public administrations.

## Data protection (GDPR)

SCALD is self-hosted so that each operator remains in control of its data.
The system stores municipal indicator data (non-personal) and a small set of
user-account details (name, e-mail, role — personal data). Operators are
responsible for providing a privacy notice, establishing a lawful basis and
records of processing, and — where an instance hosts personal data of users in
other countries — putting the appropriate data-processing agreements and
transfer safeguards in place.

## Funding

Co-funded by the **Erasmus+ Programme of the European Union**
(Key Action KA220-ADU — Cooperation Partnerships in Adult Education).

> Funded by the European Union. Views and opinions expressed are however those
> of the author(s) only and do not necessarily reflect those of the European
> Union or the European Education and Culture Executive Agency (EACEA). Neither
> the European Union nor EACEA can be held responsible for them.
