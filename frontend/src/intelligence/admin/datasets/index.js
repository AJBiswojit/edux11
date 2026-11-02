/**
 * Admin Intelligence — centralized dataset aggregation.
 *
 * The single access point for every admin dataset:
 *  · masterInstitutionProfile        → institution identity & scale
 *  · adminPeople                     → unified students/faculty/admins/parents-internal
 *  · academics relations             → dept ↔ program ↔ course ↔ subject ↔ batch
 *  · analytics inputs                → all raw admin analytics (re-exported)
 *  · ai foundations                  → insight pools, interventions, report templates
 *
 * Existing mock files are NOT deleted; existing /admin/* routes are NOT
 * touched. This aggregation exists so future modules import ONE place.
 */

import { masterInstitutionProfile, institutionProfileView } from '../master-profile.js'
import { adminPeople } from './people.js'
import * as institutions from './institutions.js'
import * as academics from './academics.js'
import * as analyticsInputs from './analytics.js'
import * as aiFoundation from './ai.js'

export {
  masterInstitutionProfile, institutionProfileView,
  adminPeople,
  institutions,
  academics,
  analyticsInputs,
  aiFoundation,
}

export const adminDatasets = {
  profile: masterInstitutionProfile,
  people: adminPeople,
  institutions,
  academics,
  analytics: analyticsInputs,
  ai: aiFoundation,
}

export default adminDatasets
