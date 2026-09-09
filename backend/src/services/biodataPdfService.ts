import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { IBiodata } from '../models/Biodata';

interface TemplateTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  headerFont: string;
  bodyFont: string;
  headerSymbol?: string;
  headerSubtitle: string;
  badgeBg: string;
  badgeText: string;
}

const THEMES: Record<string, TemplateTheme> = {
  traditional: {
    primaryColor: '#7B1113', // Deep Royal Maroon
    secondaryColor: '#B45309', // Saffron Gold
    accentColor: '#D97706',
    backgroundColor: '#FFFDF9',
    cardColor: '#FFF8F0',
    textColor: '#1F2937',
    mutedColor: '#4B5563',
    borderColor: '#E5D5BC',
    headerFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headerSymbol: '||  श्री गणेशाय नमः  ||',
    headerSubtitle: 'MATRIMONIAL BIODATA',
    badgeBg: '#FDF2E9',
    badgeText: '#9A3412',
  },
  modern: {
    primaryColor: '#0F766E', // Deep Teal / Emerald
    secondaryColor: '#0284C7', // Sky Blue
    accentColor: '#14B8A6',
    backgroundColor: '#FAFAFA',
    cardColor: '#F0FDFA',
    textColor: '#0F172A',
    mutedColor: '#475569',
    borderColor: '#CCFBF1',
    headerFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headerSubtitle: 'EXECUTIVE MATRIMONIAL BIODATA',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
  },
  elegant: {
    primaryColor: '#0A192F', // Royal Midnight Navy
    secondaryColor: '#B8860B', // Dark Goldenrod
    accentColor: '#D4AF37', // Gold
    backgroundColor: '#FDFCF9',
    cardColor: '#F7F5EE',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    borderColor: '#E2D9C8',
    headerFont: 'Times-Bold',
    bodyFont: 'Times-Roman',
    headerSubtitle: 'PREMIUM DOCTOR MATRIMONIAL PROFILE',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  doctor_professional: {
    primaryColor: '#991B1B', // Medical Crimson
    secondaryColor: '#0F172A', // Deep Slate
    accentColor: '#E11D48',
    backgroundColor: '#FFFFFF',
    cardColor: '#FFF1F2',
    textColor: '#0F172A',
    mutedColor: '#475569',
    borderColor: '#FFE4E6',
    headerFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headerSymbol: '+ WONDERFUL JODI +',
    headerSubtitle: 'DOCTORS MATRIMONIAL BIODATA',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
  },
};

/**
 * Downloads or reads an image buffer from a local path or remote URL
 */
async function getImageBuffer(urlOrPath?: string): Promise<Buffer | null> {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;

  // Local filesystem check
  if (urlOrPath.startsWith('/uploads/') || urlOrPath.startsWith('uploads/')) {
    const localRel = urlOrPath.replace(/^\//, '');
    const localAbs = path.join(process.cwd(), localRel);
    if (fs.existsSync(localAbs)) {
      try {
        return fs.readFileSync(localAbs);
      } catch (err) {
        console.warn('Failed to read local image file:', err);
      }
    }
  }

  // Remote HTTP/HTTPS download
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return new Promise((resolve) => {
      const client = urlOrPath.startsWith('https://') ? https : http;
      const timeout = setTimeout(() => resolve(null), 4000);

      client
        .get(urlOrPath, (res) => {
          if (res.statusCode !== 200) {
            clearTimeout(timeout);
            return resolve(null);
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            clearTimeout(timeout);
            resolve(Buffer.concat(chunks));
          });
        })
        .on('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
    });
  }

  // Base64 data URL
  if (urlOrPath.startsWith('data:image/')) {
    try {
      const base64Data = urlOrPath.split(',')[1];
      if (base64Data) {
        return Buffer.from(base64Data, 'base64');
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Generates an A4 PDF document for the given biodata
 */
export async function generateBiodataPdfBuffer(biodata: IBiodata): Promise<Buffer> {
  const theme = THEMES[biodata.templateId] || THEMES.doctor_professional;
  const visibility = biodata.sectionVisibility || {
    personalDetails: true,
    education: true,
    medicalCareer: true,
    family: true,
    lifestyle: true,
    horoscope: true,
    partnerPreferences: true,
    contactDetails: false,
    photo: true,
  };

  const imageBuffer = visibility.photo ? await getImageBuffer(biodata.photoUrl) : null;

  return new Promise((resolve, reject) => {
    // A4 Dimensions: 595.28 x 841.89 points
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      autoFirstPage: true,
      info: {
        Title: `${biodata.personalDetails.fullName} - Matrimonial Biodata`,
        Author: 'Wonderful Jodi - Doctor Matrimony Platform',
        Subject: 'Marriage Biodata',
        Creator: 'Wonderful Jodi Platform',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;

    // Helper: check page overflow and add new page
    const ensureSpace = (neededHeight: number) => {
      if (doc.y + neededHeight > pageHeight - margin - 30) {
        doc.addPage();
        drawPageBorder();
        doc.y = margin + 20;
      }
    };

    // Draw decorative border
    const drawPageBorder = () => {
      doc.save();
      // Outer border
      doc
        .rect(margin - 12, margin - 12, contentWidth + 24, pageHeight - margin * 2 + 24)
        .lineWidth(biodata.templateId === 'traditional' ? 2 : 1)
        .stroke(theme.borderColor);

      // Inner thin border for traditional & elegant
      if (biodata.templateId === 'traditional' || biodata.templateId === 'elegant') {
        doc
          .rect(margin - 8, margin - 8, contentWidth + 16, pageHeight - margin * 2 + 16)
          .lineWidth(0.6)
          .stroke(theme.secondaryColor);
      }
      doc.restore();
    };

    // Initial page border
    drawPageBorder();

    // ─── 1. HEADER SECTION ───
    if (theme.headerSymbol) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(theme.secondaryColor)
        .text(theme.headerSymbol, margin, doc.y + 4, { align: 'center', width: contentWidth });
      doc.moveDown(0.25);
    }

    doc
      .font(theme.headerFont)
      .fontSize(9)
      .fillColor(theme.mutedColor)
      .text('W O N D E R F U L   J O D I', margin, doc.y, { align: 'center', width: contentWidth });

    doc.moveDown(0.15);
    doc
      .font(theme.headerFont)
      .fontSize(8)
      .fillColor(theme.accentColor)
      .text(theme.headerSubtitle, { align: 'center', width: contentWidth });

    doc.moveDown(0.5);

    // Decorative divider
    doc
      .moveTo(margin + 40, doc.y)
      .lineTo(pageWidth - margin - 40, doc.y)
      .lineWidth(1)
      .stroke(theme.borderColor);

    doc.moveDown(0.8);

    // ─── 2. HERO PROFILE BANNER (PHOTO + CORE IDENTITY) ───
    const bannerTop = doc.y;
    const photoSize = 100;
    const hasPhoto = Boolean(imageBuffer);

    let textStartX = margin;
    let textWidth = contentWidth;

    if (hasPhoto && imageBuffer) {
      const photoX = margin + 10;
      const photoY = bannerTop;

      try {
        // Draw photo frame
        doc
          .roundedRect(photoX - 3, photoY - 3, photoSize + 6, photoSize + 6, 8)
          .fillAndStroke(theme.cardColor, theme.secondaryColor);

        doc.image(imageBuffer, photoX, photoY, {
          fit: [photoSize, photoSize],
          align: 'center',
          valign: 'center',
        });
      } catch (err) {
        console.warn('Error embedding photo into PDF:', err);
      }

      textStartX = photoX + photoSize + 20;
      textWidth = contentWidth - (photoSize + 30);
    }

    // Name & Credentials
    const displayName = biodata.personalDetails.fullName || 'Doctor Candidate';
    const qual = biodata.education.primaryQualification || 'MBBS';
    const pgQual = biodata.education.postgraduateQualification;
    const qualificationText = pgQual ? `${qual} • ${pgQual}` : qual;

    doc.y = bannerTop;
    doc
      .font(theme.headerFont)
      .fontSize(18)
      .fillColor(theme.primaryColor)
      .text(displayName, textStartX, doc.y, { width: textWidth, align: hasPhoto ? 'left' : 'center' });

    doc.moveDown(0.2);

    // Medical qualification pill
    doc
      .font(theme.headerFont)
      .fontSize(11)
      .fillColor(theme.secondaryColor)
      .text(qualificationText.toUpperCase(), textStartX, doc.y, {
        width: textWidth,
        align: hasPhoto ? 'left' : 'center',
      });

    if (biodata.medicalCareer.specialization) {
      doc.moveDown(0.15);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(theme.textColor)
        .text(`${biodata.medicalCareer.specialization} Specialist`, textStartX, doc.y, {
          width: textWidth,
          align: hasPhoto ? 'left' : 'center',
        });
    }

    if (biodata.medicalCareer.currentHospital) {
      doc.moveDown(0.1);
      doc
        .font(theme.bodyFont)
        .fontSize(9)
        .fillColor(theme.mutedColor)
        .text(
          `${biodata.medicalCareer.designation || 'Consultant'} at ${biodata.medicalCareer.currentHospital}`,
          textStartX,
          doc.y,
          { width: textWidth, align: hasPhoto ? 'left' : 'center' }
        );
    }

    // Key Quick Facts (Age, Height, Location)
    const quickFacts: string[] = [];
    if (biodata.personalDetails.age) quickFacts.push(`${biodata.personalDetails.age} Yrs`);
    if (biodata.personalDetails.height) quickFacts.push(biodata.personalDetails.height);
    if (biodata.personalDetails.maritalStatus) quickFacts.push(biodata.personalDetails.maritalStatus);
    if (biodata.location.currentCity) {
      const locStr = [biodata.location.currentCity, biodata.location.currentState]
        .filter(Boolean)
        .join(', ');
      quickFacts.push(locStr);
    }

    if (quickFacts.length > 0) {
      doc.moveDown(0.25);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(theme.primaryColor)
        .text(quickFacts.join('  |  '), textStartX, doc.y, {
          width: textWidth,
          align: hasPhoto ? 'left' : 'center',
        });
    }

    // Set doc.y below the hero section
    const bannerHeight = hasPhoto ? Math.max(photoSize + 15, doc.y - bannerTop) : doc.y - bannerTop;
    doc.y = bannerTop + bannerHeight + 12;

    // Helper: draw section block with modern two-column key-value grid
    const drawSection = (title: string, items: Array<{ label: string; value?: string | number }>) => {
      const validItems = items.filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== '');
      if (validItems.length === 0) return;

      const estimatedHeight = 24 + Math.ceil(validItems.length / 2) * 16 + 10;
      ensureSpace(estimatedHeight);

      // Section Header Title
      doc
        .roundedRect(margin, doc.y, contentWidth, 18, 3)
        .fill(theme.cardColor);

      doc
        .font(theme.headerFont)
        .fontSize(9.5)
        .fillColor(theme.primaryColor)
        .text(title.toUpperCase(), margin + 10, doc.y - 14, { width: contentWidth - 20 });

      doc.y += 4;
      doc.moveDown(0.3);

      // 2-column key-value grid
      const colWidth = (contentWidth - 16) / 2;
      const startY = doc.y;
      let leftY = startY;
      let rightY = startY;

      validItems.forEach((item, index) => {
        const isLeft = index % 2 === 0;
        const currentX = isLeft ? margin + 6 : margin + colWidth + 10;
        const currentY = isLeft ? leftY : rightY;

        doc.font(theme.headerFont).fontSize(8.5).fillColor(theme.mutedColor);
        doc.text(`${item.label}:`, currentX, currentY, { width: 90 });

        doc.font(theme.bodyFont).fontSize(8.5).fillColor(theme.textColor);
        doc.text(String(item.value), currentX + 92, currentY, { width: colWidth - 94 });

        const rowHeight = Math.max(14, doc.y - currentY);
        if (isLeft) {
          leftY = currentY + rowHeight;
        } else {
          rightY = currentY + rowHeight;
        }
      });

      doc.y = Math.max(leftY, rightY) + 6;
    };

    // ─── 3. PERSONAL DETAILS SECTION ───
    if (visibility.personalDetails) {
      drawSection('Personal Details', [
        { label: 'Full Name', value: biodata.personalDetails.fullName },
        { label: 'Gender', value: biodata.personalDetails.gender },
        { label: 'Date of Birth', value: biodata.personalDetails.dob },
        { label: 'Age', value: biodata.personalDetails.age ? `${biodata.personalDetails.age} Years` : undefined },
        { label: 'Height', value: biodata.personalDetails.height },
        { label: 'Marital Status', value: biodata.personalDetails.maritalStatus },
        { label: 'Religion', value: biodata.personalDetails.religion },
        { label: 'Mother Tongue', value: biodata.personalDetails.motherTongue },
        { label: 'Community/Caste', value: biodata.personalDetails.caste },
        { label: 'Sub-Caste', value: biodata.personalDetails.subCaste },
        {
          label: 'Current City',
          value: [biodata.location.currentCity, biodata.location.currentState, biodata.location.currentCountry]
            .filter(Boolean)
            .join(', '),
        },
        { label: 'Native Place', value: biodata.location.nativePlace },
      ]);
    }

    // ─── 4. MEDICAL EDUCATION SECTION ───
    if (visibility.education) {
      drawSection('Medical Education & Qualifications', [
        { label: 'Primary Degree', value: biodata.education.primaryQualification },
        { label: 'Medical College', value: biodata.education.college },
        { label: 'University', value: biodata.education.university },
        { label: 'Graduation Year', value: biodata.education.graduationYear },
        { label: 'Postgraduation', value: biodata.education.postgraduateQualification },
        { label: 'PG College/Inst.', value: biodata.education.pgCollege },
        { label: 'PG Year', value: biodata.education.pgYear },
        { label: 'Fellowship/Addl.', value: biodata.education.additionalQualification },
      ]);
    }

    // ─── 5. MEDICAL CAREER & PRACTICE SECTION ───
    if (visibility.medicalCareer) {
      drawSection('Medical Career & Clinical Practice', [
        { label: 'Occupation', value: biodata.medicalCareer.occupation },
        { label: 'Specialization', value: biodata.medicalCareer.specialization },
        { label: 'Designation', value: biodata.medicalCareer.designation },
        { label: 'Hospital/Clinic', value: biodata.medicalCareer.currentHospital },
        { label: 'Work Location', value: biodata.medicalCareer.workLocation },
        { label: 'Experience', value: biodata.medicalCareer.experience },
        { label: 'Practice Type', value: biodata.medicalCareer.practiceType },
        { label: 'Annual Income', value: biodata.medicalCareer.annualIncome },
        { label: 'Reg. Number', value: biodata.medicalCareer.medicalRegistrationNumber },
        { label: 'Medical Council', value: biodata.medicalCareer.medicalCouncil },
      ]);
    }

    // ─── 6. FAMILY BACKGROUND SECTION ───
    if (visibility.family) {
      drawSection('Family Background', [
        { label: "Father's Name", value: biodata.family.fatherName },
        { label: "Father's Occ.", value: biodata.family.fatherOccupation },
        { label: "Mother's Name", value: biodata.family.motherName },
        { label: "Mother's Occ.", value: biodata.family.motherOccupation },
        { label: 'Siblings', value: biodata.family.siblings },
        { label: 'Family Type', value: biodata.family.familyType },
        { label: 'Family Values', value: biodata.family.familyValues },
        { label: 'Family Status', value: biodata.family.familyStatus },
        { label: 'Native Place', value: biodata.family.nativePlace },
        { label: 'Family Base', value: biodata.family.familyLocation },
      ]);
    }

    // ─── 7. HOROSCOPE & KUNDALI DETAILS ───
    if (visibility.horoscope) {
      drawSection('Horoscope & Astrological Details', [
        { label: 'Date of Birth', value: biodata.horoscope.dob || biodata.personalDetails.dob },
        { label: 'Time of Birth', value: biodata.horoscope.timeOfBirth },
        { label: 'Place of Birth', value: biodata.horoscope.placeOfBirth },
        { label: 'Rashi (Moon)', value: biodata.horoscope.rashi },
        { label: 'Nakshatra', value: biodata.horoscope.nakshatra },
        { label: 'Charan / Pada', value: biodata.horoscope.pada },
        { label: 'Lagna (Ascendant)', value: biodata.horoscope.lagna },
        { label: 'Manglik Status', value: biodata.horoscope.manglik },
        { label: 'Gotra', value: biodata.horoscope.gotra },
        { label: 'Gana', value: biodata.horoscope.gana },
        { label: 'Nadi', value: biodata.horoscope.nadi },
      ]);
    }

    // ─── 8. LIFESTYLE & INTERESTS ───
    if (visibility.lifestyle) {
      drawSection('Lifestyle & Interests', [
        { label: 'Dietary Preference', value: biodata.lifestyle.diet },
        { label: 'Smoking Habit', value: biodata.lifestyle.smoking },
        { label: 'Drinking Habit', value: biodata.lifestyle.drinking },
        {
          label: 'Languages Known',
          value: biodata.lifestyle.languagesKnown && biodata.lifestyle.languagesKnown.length > 0
            ? biodata.lifestyle.languagesKnown.join(', ')
            : undefined,
        },
        {
          label: 'Hobbies',
          value: biodata.lifestyle.hobbies && biodata.lifestyle.hobbies.length > 0
            ? biodata.lifestyle.hobbies.join(', ')
            : undefined,
        },
      ]);
    }

    // ─── 9. PARTNER PREFERENCES ───
    if (visibility.partnerPreferences) {
      drawSection('Partner Expectations & Preferences', [
        { label: 'Preferred Age', value: biodata.partnerPreferences.preferredAge },
        { label: 'Preferred Height', value: biodata.partnerPreferences.preferredHeight },
        { label: 'Preferred Location', value: biodata.partnerPreferences.preferredLocation },
        { label: 'Preferred Education', value: biodata.partnerPreferences.preferredEducation },
        { label: 'Preferred Specialty', value: biodata.partnerPreferences.preferredSpecialization },
        { label: 'Marital Status', value: biodata.partnerPreferences.preferredMaritalStatus },
        { label: 'Other Expectations', value: biodata.partnerPreferences.otherExpectations },
      ]);
    }

    // ─── 10. CONTACT DETAILS (PRIVACY-GUARDED) ───
    if (visibility.contactDetails) {
      drawSection('Contact & Communication', [
        { label: 'Contact Person', value: biodata.contactDetails.contactPerson },
        { label: 'Contact Number', value: biodata.contactDetails.phone },
        { label: 'Email Address', value: biodata.contactDetails.email },
        { label: 'Residential Address', value: biodata.contactDetails.address },
      ]);
    }

    // ─── 11. FOOTER BRANDING ───
    ensureSpace(30);
    doc.moveDown(0.5);
    doc
      .moveTo(margin, doc.y)
      .lineTo(pageWidth - margin, doc.y)
      .lineWidth(0.5)
      .stroke(theme.borderColor);

    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(theme.mutedColor)
      .text(
        'Created with Wonderful Jodi — Dedicated Doctor Matrimony Platform  •  https://wonderfuljodi.com',
        margin,
        doc.y,
        { align: 'center', width: contentWidth }
      );

    doc.end();
  });
}
