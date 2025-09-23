# Site Manager Guide - Temperature Dashboard

## 👋 Welcome, Site Manager!

As a **Site Manager**, you are responsible for the temperature monitoring and alert management at your assigned physical location(s). This guide will help you effectively monitor and manage your site's temperature control systems.

## 🔐 Your Permissions

**Site-Specific Access:**
- ✅ Your assigned site(s) only
- ✅ All sensors and environments at your site
- ✅ Alert management for your site
- ✅ Threshold configuration for your site
- ❌ Cannot access other sites
- ❌ Cannot manage users or organization settings

**What You Can Do:**
- Monitor all sensors at your site
- Acknowledge and resolve alerts
- Configure site-specific thresholds
- View detailed sensor and environment data
- Access site-specific analytics

---

## 🧭 Navigation Guide

### 1. **Dashboard Overview** (`/overview`)
Your site-focused monitoring dashboard.

**What You'll See:**
- **Site KPIs**: Your site's sensor count and alert status
- **Site Alerts**: Temperature issues at your location
- **Sensor Health**: Equipment status for your site
- **Quick Access**: Direct links to your site details

**Daily Check:**
1. Review alerts specific to your site
2. Check sensor health indicators
3. Monitor temperature trends

### 2. **Sites Management** (`/sites`)
View and manage your assigned sites.

**Your Access:**
- **Your Sites Only**: You can only see sites assigned to you
- **Site Details**: Full access to your site information
- **Health Status**: Real-time monitoring of your locations

**Navigation:**
- Your assigned sites will be visible
- Click "View Details" for comprehensive site information
- Monitor alert indicators for urgent issues

### 3. **Site Detail Pages** (`/sites/[siteId]`)
Complete overview of your site operations.

**Site Information:**
- **Location Details**: Physical address and timezone
- **Environment Overview**: All temperature-controlled areas
- **Sensor Summary**: Total sensors and their status
- **Active Alerts**: Current temperature issues

**Management Tools:**
- Review all environments in your site
- Access detailed sensor information
- Monitor site-wide temperature trends

### 4. **Environment Detail Pages** (`/environments/[envId]`)
Monitor specific areas within your site.

**Environment Data:**
- **Environment Type**: Cold storage, chiller, blast freezer, etc.
- **Sensor Monitoring**: All sensors in this environment
- **Current Conditions**: Real-time temperature readings
- **Threshold Compliance**: Whether temperatures are within limits

**Configuration Access:**
- Adjust thresholds for your environments
- Review sensor placement and calibration
- Monitor environmental control systems

### 5. **Sensor Detail Pages** (`/sensors/[sensorId]`)
Individual sensor monitoring and troubleshooting.

**Sensor Metrics:**
- **Live Temperature**: Current readings
- **24-Hour History**: Temperature trends and patterns
- **Device Health**: Battery status and connectivity
- **Location Context**: Where the sensor is physically located

**Maintenance Support:**
- Identify sensors needing attention
- Review performance history
- Support calibration and replacement decisions

### 6. **Alerts Management** (`/alerts`)
Your primary tool for managing temperature issues.

**Alert Responsibilities:**
- **View Site Alerts**: All alerts from your assigned sites
- **Acknowledge Alerts**: Mark alerts as acknowledged (required)
- **Resolve Alerts**: Close alerts when issues are fixed
- **Escalation Handling**: Critical alerts may escalate to masters

**Alert Workflow:**
1. **Monitor**: Check alerts dashboard regularly
2. **Acknowledge**: Mark alerts within 15 minutes
3. **Investigate**: Visit site to assess temperature issues
4. **Resolve**: Fix problems and close alerts
5. **Document**: Note resolution steps for records

**Alert Types You Handle:**
- **Warning Alerts**: Temperature outside normal range
- **Critical Alerts**: Severe breaches or rapid temperature changes
- **Sensor Issues**: Offline sensors or connectivity problems

### 7. **Settings Access** (`/settings`)
Configure temperature thresholds for your site.

**Threshold Management:**
- **Site Level**: Set standards for your entire site
- **Environment Level**: Specific requirements per area
- **Sensor Level**: Individual sensor calibrations

**Configuration Guidelines:**
- Set realistic thresholds based on equipment capabilities
- Consider seasonal temperature variations
- Document threshold changes for compliance

---

## 📊 Daily Workflow

### Morning Site Check (8:00 AM)
1. **Review Dashboard** - Check overnight temperature stability
2. **Monitor Active Alerts** - Address any overnight issues
3. **Check Sensor Status** - Ensure all equipment is online

### Ongoing Monitoring (Throughout Day)
1. **Alert Response** - Acknowledge and investigate alerts promptly
2. **Site Walkthrough** - Physically verify temperature conditions
3. **Equipment Checks** - Monitor refrigeration unit performance
4. **Threshold Review** - Adjust for changing conditions

### Afternoon Review (4:00 PM)
1. **Alert Resolution** - Close resolved temperature issues
2. **Performance Analysis** - Review daily temperature patterns
3. **Maintenance Planning** - Schedule needed equipment service

### End of Day Handover (6:00 PM)
1. **Final Alert Check** - Ensure no pending critical issues
2. **Status Documentation** - Record any unusual occurrences
3. **Next Day Preparation** - Review upcoming maintenance schedules

---

## 🚨 Alert Response Protocol

### Immediate Response Required (< 5 minutes)
- **Critical Temperature Breach**: Equipment failure, power outage
- **Rapid Temperature Change**: Sudden spikes or drops
- **Multiple Sensor Failures**: Potential system-wide issues

**Response Steps:**
1. Acknowledge alert immediately
2. Assess situation severity
3. Notify maintenance team if needed
4. Take corrective action
5. Document resolution

### Standard Response (15-30 minutes)
- **Warning Alerts**: Temperature approaching limits
- **Single Sensor Issues**: Isolated equipment problems
- **Minor Fluctuations**: Temporary variations

**Response Steps:**
1. Acknowledge alert
2. Monitor trend for 10-15 minutes
3. Investigate if issue persists
4. Resolve or escalate as needed

### Monitoring Only (> 30 minutes)
- **Seasonal Variations**: Expected temperature changes
- **Calibration Drift**: Gradual sensor adjustments needed
- **Minor Threshold Violations**: Within acceptable ranges

---

## 🔧 Equipment Management

### Sensor Monitoring
- **Battery Levels**: Monitor and replace low batteries
- **Connectivity**: Check wireless signal strength
- **Calibration**: Schedule regular calibration checks
- **Placement**: Ensure sensors are in correct locations

### Environmental Control
- **Refrigeration Units**: Monitor compressor performance
- **Door Seals**: Check for air leaks
- **Temperature Uniformity**: Verify even cooling distribution
- **Backup Systems**: Test emergency cooling systems

### Maintenance Scheduling
- **Preventive Maintenance**: Regular equipment servicing
- **Calibration Checks**: Monthly sensor verification
- **Filter Replacement**: HVAC system maintenance
- **Emergency Drills**: Backup system testing

---

## 📊 Analytics & Reporting

### Available Data
- **Temperature Trends**: Daily and weekly patterns
- **Alert History**: Frequency and types of issues
- **Equipment Performance**: Uptime and reliability metrics
- **Compliance Reports**: Threshold adherence tracking

### Chart Features
- **Time Range Selection**: View data for specific periods
- **Sensor Comparison**: Compare multiple sensors
- **Trend Analysis**: Identify patterns and anomalies
- **Export Options**: Generate reports for management

---

## 🆘 Troubleshooting Guide

### Common Temperature Issues
- **Gradual Warming**: Check refrigeration unit performance
- **Sudden Spikes**: Investigate door openings or equipment failure
- **Sensor Drift**: Recalibrate or replace sensors
- **Power Fluctuations**: Monitor electrical supply stability

### Sensor Problems
- **Offline Sensors**: Check battery, connectivity, physical damage
- **Inaccurate Readings**: Clean sensors, check placement, recalibrate
- **Interference**: Move sensors away from heat sources or EMI

### System Issues
- **Network Problems**: Check WiFi connectivity and signal strength
- **Power Outages**: Monitor backup generator performance
- **Software Updates**: Ensure firmware is current

---

## 📞 Communication & Support

### Internal Coordination
- **Master Users**: Escalate critical issues requiring approval
- **Maintenance Team**: Coordinate equipment repairs
- **Quality Control**: Report temperature-related quality issues
- **Operations Team**: Coordinate with production schedules

### Escalation Procedures
- **Critical Alerts**: Notify master user within 15 minutes
- **System Failures**: Immediate notification to maintenance
- **Quality Issues**: Report to quality control team
- **Resource Needs**: Request additional equipment or personnel

---

## 📋 Compliance & Documentation

### Temperature Records
- **Alert Documentation**: Record all temperature excursions
- **Resolution Steps**: Document corrective actions taken
- **Preventive Measures**: Note steps to prevent recurrence
- **Compliance Reports**: Maintain records for regulatory requirements

### Quality Assurance
- **Threshold Compliance**: Ensure temperatures meet specifications
- **Equipment Validation**: Regular performance verification
- **Calibration Records**: Document sensor calibration history
- **Audit Preparation**: Maintain records for inspections

---

## 🎯 Best Practices

### Alert Management
- Always acknowledge alerts within 15 minutes
- Document investigation and resolution steps
- Review alert patterns to identify trends
- Prevent recurring issues through maintenance

### Equipment Care
- Regular cleaning and inspection of sensors
- Monitor battery levels and replace proactively
- Ensure proper sensor placement and protection
- Schedule preventive maintenance regularly

### Communication
- Keep master users informed of critical issues
- Coordinate with maintenance for timely repairs
- Document all unusual occurrences
- Share best practices with team members

---

## 📱 Mobile Access Tips

### Dashboard Navigation
- Use mobile browser for on-site access
- Focus on alerts and sensor status
- Quick acknowledgment of alerts
- Emergency contact information

### Field Operations
- Check sensor status during walkthroughs
- Acknowledge alerts from incident location
- Document field observations
- Coordinate with maintenance teams

---

## 🔄 Continuous Improvement

### Performance Monitoring
- Track alert response times
- Monitor equipment reliability
- Analyze temperature control effectiveness
- Identify improvement opportunities

### Training & Development
- Stay updated on equipment operation
- Learn new monitoring techniques
- Share knowledge with team members
- Participate in safety training

---

**Remember**: As a Site Manager, you are the first line of defense for temperature control at your location. Your prompt attention to alerts and proactive equipment management directly impacts product quality, safety, and operational efficiency.