from flask import Flask, render_template, request
from datetime import datetime
from pytz import timezone

app = Flask(__name__)

def calculate_overlap(tz1, start1, end1, tz2, start2, end2):
    tz1 = timezone(tz1)
    tz2 = timezone(tz2)

    start1 = tz1.localize(datetime.strptime(start1, '%H:%M'))
    end1 = tz1.localize(datetime.strptime(end1, '%H:%M'))

    start2 = tz2.localize(datetime.strptime(start2, '%H:%M'))
    end2 = tz2.localize(datetime.strptime(end2, '%H:%M'))

    latest_start = max(start1, start2)
    earliest_end = min(end1, end2)
    
    overlap = (earliest_end - latest_start).seconds / 3600

    if latest_start >= earliest_end:
        overlap = 0

    return overlap

@app.route('/', methods=['GET', 'POST'])
def index():
    overlap = None
    if request.method == 'POST':
        tz1 = request.form['tz1']
        start1 = request.form['start1']
        end1 = request.form['end1']
        tz2 = request.form['tz2']
        start2 = request.form['start2']
        end2 = request.form['end2']
        overlap = calculate_overlap(tz1, start1, end1, tz2, start2, end2)
    return render_template('index.html', overlap=overlap)

if __name__ == '__main__':
    app.run(debug=True)
