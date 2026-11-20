Template pieces a brand profile is turned into (see the comment block "brand profiles" in install-theme.sh).
files/  profiles with their own artwork ("logo": "files", the default)
core/   profiles that show the logo, favicons and name of the ISPConfig installation ("logo": "core")
brand_credit.htm   the maker credit, both kinds — wording "Designed by AIDGeeks" ("credit_style": "designer", the default)
credit_product.htm the same credit in the wording "Danke theme · by AIDGeeks" ("credit_style": "product"); it is
                   written to templates/brand_credit.htm in place of the first

Placeholders:  @P@ path prefix ('' or '../')   @NAME@ brand name   @ACCENT@ accent colour
               @has:<file>@ at the start of a line: keep the line only when assets/brand/<file> exists
The results are written to templates/brand_*.htm (and *_login.htm). Do not edit those; edit here and apply again.
