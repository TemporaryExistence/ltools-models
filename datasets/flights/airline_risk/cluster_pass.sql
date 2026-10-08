-- One greedy pass of the 14 CFR 399.81(c)(3) grouping (repeated by build_airline_risk.sh until nothing is left).
create or replace table modes as
select carrier, origin, dest, mon, dep_min mode_min from rem
qualify row_number() over (partition by carrier, origin, dest, mon order by n desc, dep_min) = 1;
insert into clusters
select r.carrier, r.origin, r.dest, r.mon, getvariable('pass'), m.mode_min, sum(r.n), sum(r.late30)
from rem r join modes m using (carrier, origin, dest, mon)
where abs(r.dep_min - m.mode_min) <= 30 group by all;
delete from rem where exists (select 1 from modes m where m.carrier = rem.carrier and m.origin = rem.origin
  and m.dest = rem.dest and m.mon = rem.mon and abs(rem.dep_min - m.mode_min) <= 30);
