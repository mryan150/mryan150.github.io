# Barony of Andelcrag Website

This is the official website for the Barony of Andelcrag, Middle Kingdom, Society for Creative Anachronism (SCA).

## Setup Instructions for GitHub Pages

### 1. Repository Setup
1. Create a new repository on GitHub (name it `BaronyOfAndelcrag` or similar)
2. Upload all the files from this directory to the repository
3. Go to repository Settings > Pages
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click "Save"

### 2. Configuration
1. Edit `_config.yml` and update the following:
   - Replace `your-username` with your actual GitHub username
   - Update the `baseurl` if you named your repository differently
   - Add social media usernames if desired

### 3. Custom Domain (Optional)
If you want to use a custom domain like `andelcrag.midrealm.org`:
1. Create a file named `CNAME` in the root directory
2. Add your domain name to the file (one line, no http://)
3. Configure your domain's DNS to point to GitHub Pages

### 4. Content Updates
To update the website content:
1. Edit `index.html` directly for quick changes
2. Modify `styles.css` for styling changes
3. Changes will automatically deploy when pushed to the main branch

## Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Layout**: Clean, professional appearance
- **SEO Optimized**: Good search engine visibility
- **Easy to Update**: Simple HTML structure for easy maintenance
- **Accessible**: Screen reader friendly and keyboard navigable

## Sections Included

1. **Home**: Welcome message and baronial leadership
2. **Officers**: Complete list of baronial officers with contact info
3. **Events**: Placeholder for upcoming events
4. **Newcomers**: Information for new SCA members
5. **Contact**: Contact information and key personnel

## Adding Content

### Adding Events
Create new events by editing the Events section in `index.html` or by creating individual event files in a `_events` folder.

### Adding News/Updates
Add news items to the homepage or create a news section by modifying the HTML structure.

### Adding Images
1. Create an `images` folder in your repository
2. Upload images to the folder
3. Reference them in HTML with `<img src="images/filename.jpg" alt="description">`

## Maintenance

- Regular updates to officer information
- Event calendar maintenance
- Content updates as needed
- Periodic review of contact information

## Technical Notes

- Built with HTML5, CSS3, and vanilla JavaScript
- Uses Google Fonts (Cinzel and Open Sans)
- Responsive grid layout
- Smooth scrolling navigation
- Print-friendly styles included

## Contact

For technical issues with the website, contact the Web Minister:
- **Lord Sai'd al-Abzari** (Mitchell Ryan)
- Email: baronyofandelcrag@gmail.com

---

*This website is maintained by the Barony of Andelcrag Web Minister and is the official website for the Barony of Andelcrag of the Society for Creative Anachronism, Inc.* 