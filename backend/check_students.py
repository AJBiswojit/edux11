import psycopg2

roll_nos = ['260059','260065','260068','260070','260071','260077','260084','260088','260090','260091','260094','260096','260097','260098']

conn = psycopg2.connect(
    host='16.112.15.5', port=5432, dbname='postgres',
    user='MEdixo', password='llUNUFIiX1tk30CGmEYt',
    sslmode='require', connect_timeout=10
)
cur = conn.cursor()
cur.execute("SELECT roll_no FROM edux.student_profiles WHERE roll_no = ANY(%s)", (roll_nos,))
found = {row[0] for row in cur.fetchall()}
missing = [r for r in roll_nos if r not in found]
print('FOUND:', sorted(found))
print('MISSING:', missing)
print(f'\n{len(found)} in DB, {len(missing)} NOT in DB')
cur.close()
conn.close()
